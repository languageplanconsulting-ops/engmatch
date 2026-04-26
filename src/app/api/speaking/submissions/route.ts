import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { POST as assessSpeaking } from "@/app/api/speaking/assess/route";

type CreateSubmissionBody = {
  prompt: string;
  transcript: string;
  audioUrl?: string;
  mode?: "part-1" | "part-2" | "part-3";
  packId?: string;
  questionId?: string;
};

type WhisperVerboseResponse = {
  text?: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word?: string;
    probability?: number;
    confidence?: number;
    start?: number;
    end?: number;
  }>;
  segments?: Array<{
    id?: number;
    start?: number;
    end?: number;
    avg_logprob?: number;
    no_speech_prob?: number;
    compression_ratio?: number;
    words?: Array<{
      word?: string;
      probability?: number;
      confidence?: number;
      start?: number;
      end?: number;
    }>;
  }>;
};

type SpeakingDelegates = {
  speakingSubmission?: {
    findMany: (args: { orderBy: { createdAt: "desc" }; take: number }) => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  speakingPack?: {
    upsert: (args: { where: { packId: string }; update: Record<string, unknown>; create: Record<string, unknown> }) => Promise<unknown>;
  };
  speakingAttempt?: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
};

function getSpeakingDelegates() {
  return prisma as unknown as SpeakingDelegates;
}

async function buildWhisperAudioMetadata(audioUrl: string, prompt: string, transcript: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) return null;
    const contentType = audioRes.headers.get("content-type") || "audio/webm";
    const ext = contentType.includes("mpeg")
      ? "mp3"
      : contentType.includes("wav")
        ? "wav"
        : contentType.includes("mp4")
          ? "m4a"
          : "webm";
    const audioBuffer = await audioRes.arrayBuffer();
    const file = new File([audioBuffer], `speaking.${ext}`, { type: contentType });

    const form = new FormData();
    form.append("file", file);
    form.append("model", process.env.OPENAI_WHISPER_MODEL || "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
    form.append("prompt", prompt);
    form.append("language", "en");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!whisperRes.ok) return null;
    const whisper = (await whisperRes.json()) as WhisperVerboseResponse;

    const segmentCount = whisper.segments?.length ?? 0;
    const avgLogprob =
      segmentCount > 0
        ? (whisper.segments ?? []).reduce((sum, s) => sum + (s.avg_logprob ?? 0), 0) / segmentCount
        : null;
    const avgNoSpeechProb =
      segmentCount > 0
        ? (whisper.segments ?? []).reduce((sum, s) => sum + (s.no_speech_prob ?? 0), 0) / segmentCount
        : null;
    const durationSec = Number(whisper.duration ?? 0);
    const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;
    const wordsPerMinute =
      durationSec > 0 ? Math.round((transcriptWords / durationSec) * 60) : null;
    const wordRows = [
      ...(Array.isArray(whisper.words) ? whisper.words : []),
      ...((whisper.segments ?? []).flatMap((segment) => (Array.isArray(segment.words) ? segment.words : []))),
    ];
    const lowConfidenceWords = wordRows
      .map((row) => {
        const word = typeof row.word === "string" ? row.word.trim() : "";
        const rawConfidence =
          typeof row.probability === "number"
            ? row.probability
            : typeof row.confidence === "number"
              ? row.confidence
              : NaN;
        if (!word || !Number.isFinite(rawConfidence)) return null;
        const confidencePct = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence);
        return { word, confidencePct };
      })
      .filter((row): row is { word: string; confidencePct: number } => Boolean(row))
      .filter((row) => row.confidencePct < 90)
      .slice(0, 12);

    return {
      source: "openai-whisper",
      model: process.env.OPENAI_WHISPER_MODEL || "whisper-1",
      language: whisper.language ?? "unknown",
      durationSec: durationSec > 0 ? Number(durationSec.toFixed(2)) : null,
      segmentCount,
      avgLogprob: avgLogprob !== null ? Number(avgLogprob.toFixed(3)) : null,
      avgNoSpeechProb: avgNoSpeechProb !== null ? Number(avgNoSpeechProb.toFixed(3)) : null,
      wordsPerMinute,
      whisperTranscriptPreview: (whisper.text ?? "").slice(0, 240),
      lowConfidenceWords,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const delegates = getSpeakingDelegates();
  if (!delegates.speakingSubmission) {
    return NextResponse.json({ error: "Speaking submission model is unavailable in Prisma client." }, { status: 503 });
  }
  const items = await delegates.speakingSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  let body: CreateSubmissionBody;
  try {
    body = (await req.json()) as CreateSubmissionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const transcript = body.transcript?.trim();
  if (!prompt || !transcript) {
    return NextResponse.json({ error: "prompt and transcript are required." }, { status: 400 });
  }

  const audioMetadata =
    typeof body.audioUrl === "string" && body.audioUrl.trim()
      ? await buildWhisperAudioMetadata(body.audioUrl, prompt, transcript)
      : null;

  const assessReq = new Request("https://internal/api/speaking/assess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: prompt,
      transcript,
      mode: body.mode === "part-2" ? "part-2" : body.mode === "part-3" ? "part-3" : "part-1",
      runtimeMode: "practice",
      audioMetadata,
    }),
  });
  const assessRes = await assessSpeaking(assessReq);
  const aiReport = (await assessRes.json()) as Prisma.InputJsonValue;
  const reportObj = aiReport && typeof aiReport === "object" ? (aiReport as Record<string, unknown>) : null;
  if (!assessRes.ok) {
    const message =
      typeof reportObj?.error === "string"
        ? reportObj.error
        : "Speaking assessment failed before a report could be created.";
    return NextResponse.json(
      {
        error: message,
        providerFailures: Array.isArray(reportObj?.providerFailures) ? reportObj.providerFailures : [],
        providerDiagnostics: Array.isArray(reportObj?.providerDiagnostics) ? reportObj.providerDiagnostics : [],
      },
      { status: assessRes.status || 502 },
    );
  }
  if (reportObj?.errorCode === "fallback") {
    return NextResponse.json(
      {
        error:
          "Speaking assessment only produced a fallback estimate, so the report was not saved. Fix the AI provider configuration and try again.",
        fallbackReason: typeof reportObj.fallbackReason === "string" ? reportObj.fallbackReason : null,
        providerFailures: Array.isArray(reportObj.providerFailures) ? reportObj.providerFailures : [],
        attemptedProviders: Array.isArray(reportObj.attemptedProviders) ? reportObj.attemptedProviders : [],
      },
      { status: 502 },
    );
  }
  const overallBand = (() => {
    if (!aiReport || typeof aiReport !== "object") return 0;
    const overall = (aiReport as Record<string, unknown>).overall;
    if (typeof overall === "number") return Number.isFinite(overall) ? overall : 0;
    if (overall && typeof overall === "object") {
      const rounded = Number((overall as Record<string, unknown>).roundedBand ?? 0);
      return Number.isFinite(rounded) ? rounded : 0;
    }
    return 0;
  })();
  const delegates = getSpeakingDelegates();
  if (!delegates.speakingPack || !delegates.speakingAttempt || !delegates.speakingSubmission) {
    return NextResponse.json({ error: "Speaking models are unavailable in Prisma client." }, { status: 503 });
  }
  const effectivePackId = body.packId ?? "manual-report";
  await delegates.speakingPack.upsert({
    where: { packId: effectivePackId },
    update: {},
    create: {
      packId: effectivePackId,
      mode: body.mode ?? "part-3",
      part: body.mode ?? "part-3",
      name: "Manual speaking report",
      topic: "Manual",
      questionCount: 1,
      uploadedAt: new Date(),
      payload: {
        id: effectivePackId,
        mode: body.mode ?? "part-3",
        name: "Manual speaking report",
        topic: "Manual",
      } as Prisma.InputJsonValue,
    },
  });

  const attempt = await delegates.speakingAttempt.create({
    data: {
      packId: effectivePackId,
      mode: body.mode ?? "part-3",
      status: "completed",
      currentBand: Number.isFinite(overallBand) ? overallBand : null,
      bestBand: Number.isFinite(overallBand) ? overallBand : null,
    },
  });
  const created = await delegates.speakingSubmission.create({
    data: {
      attemptId: attempt.id,
      questionId: body.questionId ?? "manual-question",
      prompt,
      transcript,
      audioUrl: body.audioUrl ?? null,
      aiReport,
      overallBand: Number.isFinite(overallBand) ? overallBand : null,
      status: "ai_ready",
      feedbackReadyAt: new Date(),
      feedbackProvider: typeof reportObj?.feedbackSource === "string" ? reportObj.feedbackSource : null,
      feedbackModel: typeof reportObj?.feedbackModel === "string" ? reportObj.feedbackModel : null,
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
