import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AssessBody = {
  question: string;
  transcript: string;
  mode: "part-1" | "part-2" | "part-3";
  runtimeMode?: "mock" | "practice" | "intensive";
  previousOverall?: number;
};

export type CriterionDetail = {
  band: number;
  englishExplanation: string;
  thaiExplanation: string;
  evidenceFromTranscript?: string[];
  evidence?: string[];
  mainIssues: string[];
  howToImprove: {
    english: string[];
    thai: string[];
  };
  limitation?: string;
};

export type AnnotatedPhrase = {
  phrase: string;
  category: "grammar" | "vocabulary" | "pronunciation" | "coherence";
  issue: string;
  correction: string;
};

export type MajorMistake = {
  category: "grammar" | "vocabulary";
  phrase: string;
  issue: string;
  suggestion: string;
};

export type AssessmentResult = {
  overall: {
    rawAverage: number;
    roundedBand: number;
    confidence: "low" | "medium" | "high";
    scoreType: "single_answer_estimate" | "full_test_estimate";
    englishSummary: string;
    thaiSummary: string;
    reliabilityWarning: string;
  };
  responseInfo: {
    part: string;
    question: string;
    wordCount: number;
    responseLength: "too short" | "short" | "adequate" | "extended";
    possibleSpeechToTextErrors: string[];
  };
  criteria: {
    fluencyCoherence: CriterionDetail;
    lexicalResource: CriterionDetail;
    grammarRangeAccuracy: CriterionDetail;
    pronunciation: CriterionDetail;
  };
  grammarCorrections: Array<{
    original: string;
    corrected: string;
    thaiExplanation: string;
  }>;
  vocabularyUpgrades: Array<{
    original: string;
    better: string;
    thaiExplanation: string;
  }>;
  priorityActions: Array<{
    english: string;
    thai: string;
  }>;
  sampleImprovedAnswer: {
    english: string;
    thaiNote: string;
  };
  errorCode?: string;
};

function toScore(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2));
}

function parseJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value;
  }
  return "";
}

function firstEnvKey(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return key;
  }
  return "";
}

function clip(text: string, max = 220) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

class ProviderCallError extends Error {
  code: string;
  status?: number;
  responseSnippet?: string;
  constructor(message: string, code: string, status?: number, responseSnippet?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.responseSnippet = responseSnippet;
  }
}

const ASSESSMENT_PROMPT_PREAMBLE = `You are an expert IELTS Speaking examiner and bilingual English-Thai speaking coach.

Assess the candidate using IELTS Speaking criteria:
1. Fluency and Coherence
2. Lexical Resource
3. Grammatical Range and Accuracy
4. Pronunciation

You will receive:
- IELTS Speaking part
- Examiner question
- Speech-to-text transcript
- Optional audio metadata

Important rules:
- Grade conservatively.
- Do not over-score short answers.
- Do not reward memorized-sounding language too much.
- Do not give Band 7+ unless the candidate shows clear flexibility and control.
- Do not give Band 8+ unless errors are rare and the response is natural, fluent, and precise.
- If only transcript is available, pronunciation must be marked as estimated and low-confidence.
- Separate speech-to-text errors from real language errors.
- Use IELTS Speaking standards, not writing standards.
- Give practical advice that helps the student improve by 0.5-1 band.

Bilingual output rules:
- Every major explanation must include English and Thai.
- English should be clear and examiner-like.
- Thai should explain the problem naturally for Thai learners.
- Do not make the Thai explanation too long.
- Avoid vague comments like "use better vocabulary."
- Always give concrete examples.

Length control:
- English explanation per criterion: max 45 words.
- Thai explanation per criterion: max 70 Thai words.
- Evidence per criterion: max 3 items.
- Improvement advice per criterion: max 2 items.
- Grammar corrections: max 5.
- Vocabulary upgrades: max 5.
- Sample improved answer: max 150 words.

Return valid JSON only.
Do not include markdown.
Do not include extra commentary outside JSON.

Use this JSON format exactly:
{
  "overall": {
    "rawAverage": 0,
    "roundedBand": 0,
    "confidence": "low | medium | high",
    "scoreType": "single_answer_estimate | full_test_estimate",
    "englishSummary": "",
    "thaiSummary": "",
    "reliabilityWarning": ""
  },
  "responseInfo": {
    "part": "",
    "question": "",
    "wordCount": 0,
    "responseLength": "too short | short | adequate | extended",
    "possibleSpeechToTextErrors": []
  },
  "criteria": {
    "fluencyCoherence": {
      "band": 0,
      "englishExplanation": "",
      "thaiExplanation": "",
      "evidenceFromTranscript": [],
      "mainIssues": [],
      "howToImprove": {
        "english": [],
        "thai": []
      }
    },
    "lexicalResource": {
      "band": 0,
      "englishExplanation": "",
      "thaiExplanation": "",
      "evidenceFromTranscript": [],
      "mainIssues": [],
      "howToImprove": {
        "english": [],
        "thai": []
      }
    },
    "grammarRangeAccuracy": {
      "band": 0,
      "englishExplanation": "",
      "thaiExplanation": "",
      "evidenceFromTranscript": [],
      "mainIssues": [],
      "howToImprove": {
        "english": [],
        "thai": []
      }
    },
    "pronunciation": {
      "band": 0,
      "englishExplanation": "",
      "thaiExplanation": "",
      "evidence": [],
      "mainIssues": [],
      "howToImprove": {
        "english": [],
        "thai": []
      },
      "limitation": ""
    }
  },
  "grammarCorrections": [
    {
      "original": "",
      "corrected": "",
      "thaiExplanation": ""
    }
  ],
  "vocabularyUpgrades": [
    {
      "original": "",
      "better": "",
      "thaiExplanation": ""
    }
  ],
  "priorityActions": [
    {
      "english": "",
      "thai": ""
    }
  ],
  "sampleImprovedAnswer": {
    "english": "",
    "thaiNote": ""
  }
}`;

function buildAssessmentPrompt(body: AssessBody) {
  return `${ASSESSMENT_PROMPT_PREAMBLE}

Now assess this IELTS Speaking response.

IELTS Speaking Part:
${body.mode}

Question:
${body.question}

Speech-to-text transcript:
${body.transcript}

Audio metadata, if available:
none`;
}

function fallbackAssessment(transcript: string, previousOverall: number | undefined): AssessmentResult {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const baseBand = words > 160 ? 6.5 : words > 100 ? 6 : words > 60 ? 5.5 : 5;
  const roundedBand = toScore(baseBand);
  const scoreType = "single_answer_estimate" as const;
  const responseLength: AssessmentResult["responseInfo"]["responseLength"] =
    words < 20 ? "too short" : words < 50 ? "short" : words < 140 ? "adequate" : "extended";
  return {
    overall: {
      rawAverage: roundedBand,
      roundedBand,
      confidence: "low",
      scoreType,
      englishSummary: "AI is temporarily unavailable; this is a conservative deterministic estimate.",
      thaiSummary: "ระบบ AI ไม่พร้อมชั่วคราว จึงแสดงคะแนนประมาณการแบบระมัดระวัง",
      reliabilityWarning: "Pronunciation is estimated with low confidence because no validated audio analysis is available.",
    },
    responseInfo: {
      part: "",
      question: "",
      wordCount: words,
      responseLength,
      possibleSpeechToTextErrors: [],
    },
    criteria: {
      fluencyCoherence: {
        band: roundedBand,
        englishExplanation: "Temporary estimate based on transcript length and continuity.",
        thaiExplanation: "คะแนนชั่วคราวจากความยาวคำตอบและความต่อเนื่องของข้อความ",
        evidenceFromTranscript: [],
        mainIssues: [],
        howToImprove: { english: [], thai: [] },
      },
      lexicalResource: {
        band: toScore(roundedBand - 0.5),
        englishExplanation: "Temporary estimate for vocabulary range and appropriacy.",
        thaiExplanation: "คะแนนชั่วคราวด้านช่วงคำศัพท์และความเหมาะสมในการใช้คำ",
        evidenceFromTranscript: [],
        mainIssues: [],
        howToImprove: { english: [], thai: [] },
      },
      grammarRangeAccuracy: {
        band: toScore(roundedBand - 0.5),
        englishExplanation: "Temporary estimate for grammar range and control.",
        thaiExplanation: "คะแนนชั่วคราวด้านความหลากหลายและความถูกต้องของไวยากรณ์",
        evidenceFromTranscript: [],
        mainIssues: [],
        howToImprove: { english: [], thai: [] },
      },
      pronunciation: {
        band: roundedBand,
        englishExplanation: "Estimated from transcript only.",
        thaiExplanation: "ประเมินจากข้อความถอดเสียงเท่านั้น",
        evidence: [],
        mainIssues: [],
        howToImprove: { english: [], thai: [] },
        limitation: "Audio not available; pronunciation confidence is low.",
      },
    },
    grammarCorrections: [],
    vocabularyUpgrades: [],
    priorityActions: [],
    sampleImprovedAnswer: {
      english: transcript.trim(),
      thaiNote: "ตัวอย่างนี้อิงจากคำตอบเดิมเนื่องจากระบบประเมินชั่วคราว",
    },
    errorCode: "fallback",
  };
}

function normalizeAssessmentResult(body: AssessBody, data: Record<string, unknown>): AssessmentResult {
  const overallNode = (data.overall ?? {}) as Record<string, unknown>;
  const criteriaNode = (data.criteria ?? {}) as Record<string, unknown>;
  const responseInfoNode = (data.responseInfo ?? {}) as Record<string, unknown>;
  const roundedBand = toScore(overallNode.roundedBand);
  const rawAverage = toScore(overallNode.rawAverage);
  return {
    overall: {
      rawAverage,
      roundedBand,
      confidence:
        overallNode.confidence === "high" || overallNode.confidence === "medium" || overallNode.confidence === "low"
          ? overallNode.confidence
          : "low",
      scoreType:
        overallNode.scoreType === "full_test_estimate" ? "full_test_estimate" : "single_answer_estimate",
      englishSummary: String(overallNode.englishSummary ?? ""),
      thaiSummary: String(overallNode.thaiSummary ?? ""),
      reliabilityWarning: String(overallNode.reliabilityWarning ?? ""),
    },
    responseInfo: {
      part: String(responseInfoNode.part ?? body.mode),
      question: String(responseInfoNode.question ?? body.question),
      wordCount: Math.max(0, Number(responseInfoNode.wordCount ?? body.transcript.split(/\s+/).filter(Boolean).length)),
      responseLength:
        responseInfoNode.responseLength === "too short" ||
        responseInfoNode.responseLength === "short" ||
        responseInfoNode.responseLength === "adequate" ||
        responseInfoNode.responseLength === "extended"
          ? responseInfoNode.responseLength
          : "short",
      possibleSpeechToTextErrors: Array.isArray(responseInfoNode.possibleSpeechToTextErrors)
        ? responseInfoNode.possibleSpeechToTextErrors.map((v) => String(v))
        : [],
    },
    criteria: {
      fluencyCoherence: criteriaNode.fluencyCoherence as CriterionDetail,
      lexicalResource: criteriaNode.lexicalResource as CriterionDetail,
      grammarRangeAccuracy: criteriaNode.grammarRangeAccuracy as CriterionDetail,
      pronunciation: criteriaNode.pronunciation as CriterionDetail,
    },
    grammarCorrections: Array.isArray(data.grammarCorrections)
      ? (data.grammarCorrections as Array<Record<string, unknown>>).slice(0, 5).map((row) => ({
          original: String(row.original ?? ""),
          corrected: String(row.corrected ?? ""),
          thaiExplanation: String(row.thaiExplanation ?? ""),
        }))
      : [],
    vocabularyUpgrades: Array.isArray(data.vocabularyUpgrades)
      ? (data.vocabularyUpgrades as Array<Record<string, unknown>>).slice(0, 5).map((row) => ({
          original: String(row.original ?? ""),
          better: String(row.better ?? ""),
          thaiExplanation: String(row.thaiExplanation ?? ""),
        }))
      : [],
    priorityActions: Array.isArray(data.priorityActions)
      ? (data.priorityActions as Array<Record<string, unknown>>).map((row) => ({
          english: String(row.english ?? ""),
          thai: String(row.thai ?? ""),
        }))
      : [],
    sampleImprovedAnswer: {
      english: String((data.sampleImprovedAnswer as Record<string, unknown> | undefined)?.english ?? body.transcript),
      thaiNote: String((data.sampleImprovedAnswer as Record<string, unknown> | undefined)?.thaiNote ?? ""),
    },
  };
}

async function callOpenAI(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("OPENAI_API_KEY", "CHATGPT_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing OpenAI key.", "missing_key");
  const model = process.env.OPENAI_SPEAKING_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_output_tokens: 2500, input: prompt }),
    signal,
  });
  if (!res.ok) {
    const responseSnippet = clip(await res.text().catch(() => ""));
    throw new ProviderCallError(`OpenAI HTTP ${res.status}`, "http_error", res.status, responseSnippet);
  }
  const payload = (await res.json()) as { output_text?: string };
  const text = payload.output_text?.trim() ?? "";
  if (!text) throw new ProviderCallError("OpenAI returned empty output_text.", "empty_response");
  return { provider: "openai" as const, model, text };
}

async function callClaude(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("ANTHROPIC_API_KEY", "CLAUDE_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing Claude key.", "missing_key");
  const model = process.env.ANTHROPIC_SPEAKING_MODEL || "claude-3-5-sonnet-latest";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });
  if (!res.ok) {
    const responseSnippet = clip(await res.text().catch(() => ""));
    throw new ProviderCallError(`Claude HTTP ${res.status}`, "http_error", res.status, responseSnippet);
  }
  const payload = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = payload.content?.find((item) => item.type === "text")?.text ?? "";
  if (!text.trim()) throw new ProviderCallError("Claude returned empty text.", "empty_response");
  return { provider: "anthropic" as const, model, text: text.trim() };
}

async function callGemini(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("GEMINI_API_KEY", "GOOGLE_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing Gemini key.", "missing_key");
  const model = process.env.GEMINI_SPEAKING_MODEL || "gemini-1.5-pro";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { temperature: 0.2, maxOutputTokens: 3000 },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
    signal,
  });
  if (!res.ok) {
    const responseSnippet = clip(await res.text().catch(() => ""));
    throw new ProviderCallError(`Gemini HTTP ${res.status}`, "http_error", res.status, responseSnippet);
  }
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text.trim()) throw new ProviderCallError("Gemini returned empty text.", "empty_response");
  return { provider: "gemini" as const, model, text: text.trim() };
}

async function logUsage(
  success: boolean,
  latencyMs: number,
  provider: "openai" | "anthropic" | "gemini",
  model: string,
  errorCode?: string,
) {
  try {
    const usageDelegate = (
      prisma as unknown as {
        aiUsageEvent?: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
      }
    ).aiUsageEvent;
    if (!usageDelegate) return;
    await usageDelegate.create({
      data: {
        feature: "speaking-assessment",
        endpoint: "/api/speaking/assess",
        provider,
        model,
        success,
        estimatedCostUsd: success ? 0.004 : 0,
        latencyMs,
        errorCode: errorCode ?? null,
      },
    });
  } catch {
    // Ignore analytics failures.
  }
}

export async function POST(req: Request) {
  let body: AssessBody;
  try {
    body = (await req.json()) as AssessBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.transcript?.trim()) {
    return NextResponse.json({ error: "transcript field is required." }, { status: 400 });
  }
  const prompt = buildAssessmentPrompt(body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  const startedAt = Date.now();
  const envDiagnostics = {
    openai: {
      keyDetected: Boolean(firstEnv("OPENAI_API_KEY", "CHATGPT_API_KEY")),
      keyName: firstEnvKey("OPENAI_API_KEY", "CHATGPT_API_KEY") || null,
      model: process.env.OPENAI_SPEAKING_MODEL || "gpt-4o-mini",
    },
    claude: {
      keyDetected: Boolean(firstEnv("ANTHROPIC_API_KEY", "CLAUDE_API_KEY")),
      keyName: firstEnvKey("ANTHROPIC_API_KEY", "CLAUDE_API_KEY") || null,
      model: process.env.ANTHROPIC_SPEAKING_MODEL || "claude-3-5-sonnet-latest",
    },
    gemini: {
      keyDetected: Boolean(firstEnv("GEMINI_API_KEY", "GOOGLE_API_KEY")),
      keyName: firstEnvKey("GEMINI_API_KEY", "GOOGLE_API_KEY") || null,
      model: process.env.GEMINI_SPEAKING_MODEL || "gemini-1.5-pro",
    },
  };
  const providers: Array<() => Promise<{ provider: "openai" | "anthropic" | "gemini"; model: string; text: string }>> = [
    () => callOpenAI(prompt, controller.signal),
    () => callClaude(prompt, controller.signal),
    () => callGemini(prompt, controller.signal),
  ];
  const failures: string[] = [];
  const providerDiagnostics: Array<{
    provider: "openai" | "anthropic" | "gemini";
    model: string;
    keyDetected: boolean;
    keyName: string | null;
    stage: "call" | "parse" | "normalize";
    errorCode: string;
    message: string;
    status?: number;
    responseSnippet?: string;
  }> = [];
  const providerOrder: Array<"openai" | "anthropic" | "gemini"> = ["openai", "anthropic", "gemini"];
  try {
    for (const [idx, callProvider] of providers.entries()) {
      const providerId = providerOrder[idx];
      try {
        const output = await callProvider();
        let data: Record<string, unknown>;
        try {
          data = parseJsonObject(output.text);
        } catch (err) {
          const parseMsg = err instanceof Error ? err.message : "parse-failed";
          failures.push(`${providerId}:parse:${parseMsg}`);
          providerDiagnostics.push({
            provider: providerId,
            model: output.model,
            keyDetected: envDiagnostics[providerId === "anthropic" ? "claude" : providerId].keyDetected,
            keyName: envDiagnostics[providerId === "anthropic" ? "claude" : providerId].keyName,
            stage: "parse",
            errorCode: "invalid_json",
            message: parseMsg,
            responseSnippet: clip(output.text),
          });
          continue;
        }
        const result = normalizeAssessmentResult(body, data);
        if (!result.overall.roundedBand) {
          failures.push(`${providerId}:normalize:invalid-band`);
          providerDiagnostics.push({
            provider: providerId,
            model: output.model,
            keyDetected: envDiagnostics[providerId === "anthropic" ? "claude" : providerId].keyDetected,
            keyName: envDiagnostics[providerId === "anthropic" ? "claude" : providerId].keyName,
            stage: "normalize",
            errorCode: "invalid_band",
            message: "Provider response normalized but roundedBand is 0.",
          });
          continue;
        }
        clearTimeout(timeout);
        await logUsage(true, Date.now() - startedAt, output.provider, output.model);
        return NextResponse.json(result);
      } catch (err) {
        const detail = envDiagnostics[providerId === "anthropic" ? "claude" : providerId];
        if (err instanceof ProviderCallError) {
          failures.push(`${providerId}:${err.code}:${err.message}`);
          providerDiagnostics.push({
            provider: providerId,
            model: detail.model,
            keyDetected: detail.keyDetected,
            keyName: detail.keyName,
            stage: "call",
            errorCode: err.code,
            message: err.message,
            status: err.status,
            responseSnippet: err.responseSnippet,
          });
        } else {
          const msg = err instanceof Error ? err.message : "unknown";
          failures.push(`${providerId}:unknown:${msg}`);
          providerDiagnostics.push({
            provider: providerId,
            model: detail.model,
            keyDetected: detail.keyDetected,
            keyName: detail.keyName,
            stage: "call",
            errorCode: "unknown",
            message: msg,
          });
        }
      }
    }
    clearTimeout(timeout);
    await logUsage(false, Date.now() - startedAt, "openai", process.env.OPENAI_SPEAKING_MODEL || "gpt-4o-mini", failures.join(";"));
    return NextResponse.json(
      {
        error: "All assessment providers failed. Check provider API keys/models in Vercel env and redeploy.",
        providerFailures: failures,
        providerDiagnostics,
        envDiagnostics,
      },
      { status: 502 },
    );
  } catch {
    clearTimeout(timeout);
    await logUsage(false, Date.now() - startedAt, "openai", process.env.OPENAI_SPEAKING_MODEL || "gpt-4o-mini", "network");
    return NextResponse.json({ error: "Assessment request failed." }, { status: 502 });
  }
}
