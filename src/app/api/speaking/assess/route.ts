import { NextResponse } from "next/server";

type AssessBody = {
  question: string;
  transcript: string;
  mode: "part-1" | "part-2" | "part-3";
  runtimeMode?: "mock" | "practice" | "intensive";
  previousOverall?: number;
  audioMetadata?: unknown;
  forceProvider?: "gemini" | "anthropic" | "openai";
};

type ProviderId = "gemini" | "anthropic" | "openai";

type ProviderDiagnostic = {
  provider: ProviderId;
  configured: boolean;
  attempted: boolean;
  ok: boolean;
  model?: string;
  stage?: "config" | "request" | "response" | "parse" | "normalize";
  code?: string;
  message?: string;
  status?: number;
  responsePreview?: string;
};

type ProviderResponse = {
  provider: ProviderId;
  model: string;
  text: string;
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
  feedbackSource?: "openai" | "anthropic" | "gemini";
  feedbackModel?: string;
  errorCode?: string;
  fallbackReason?: string;
  attemptedProviders?: string[];
  providerFailures?: string[];
  providerDiagnostics?: ProviderDiagnostic[];
};

class ProviderCallError extends Error {
  code: string;
  status?: number;
  constructor(message: string, code: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function toScore(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2));
}

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value;
  }
  return "";
}

function parseJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in model output");
  const raw = text.slice(start, end + 1);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned) as Record<string, unknown>;
  }
}

function normalizeSpeechSurface(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCosmeticSpeechOnlyCorrection(original: string, corrected: string) {
  return normalizeSpeechSurface(original) === normalizeSpeechSurface(corrected);
}

function isMostlyContractionExpansion(original: string, corrected: string) {
  const normalize = (s: string) => s.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const expanded = normalize(original)
    .replace(/\bi'm\b/g, "i am")
    .replace(/\bit's\b/g, "it is")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bi've\b/g, "i have")
    .replace(/\bi'd\b/g, "i would")
    .replace(/\bi'll\b/g, "i will");
  return expanded === normalize(corrected);
}

function applySpokenCorrectionFilter(rows: AssessmentResult["grammarCorrections"]) {
  return rows.filter((row) => {
    if (!row.original || !row.corrected) return false;
    if (isCosmeticSpeechOnlyCorrection(row.original, row.corrected)) return false;
    if (isMostlyContractionExpansion(row.original, row.corrected)) return false;
    return true;
  });
}

function normalizeCriterion(input: unknown): CriterionDetail {
  const n = (input ?? {}) as Record<string, unknown>;
  const improve = (n.howToImprove ?? {}) as Record<string, unknown>;
  return {
    band: toScore(n.band),
    englishExplanation: String(n.englishExplanation ?? ""),
    thaiExplanation: String(n.thaiExplanation ?? ""),
    evidenceFromTranscript: Array.isArray(n.evidenceFromTranscript) ? n.evidenceFromTranscript.map(String) : [],
    evidence: Array.isArray(n.evidence) ? n.evidence.map(String) : [],
    mainIssues: Array.isArray(n.mainIssues) ? n.mainIssues.map(String) : [],
    howToImprove: {
      english: Array.isArray(improve.english) ? improve.english.map(String) : [],
      thai: Array.isArray(improve.thai) ? improve.thai.map(String) : [],
    },
    limitation: typeof n.limitation === "string" ? n.limitation : undefined,
  };
}

function normalizeAssessmentResult(body: AssessBody, data: Record<string, unknown>): AssessmentResult {
  const words = body.transcript.trim().split(/\s+/).filter(Boolean).length;
  const overall = (data.overall ?? {}) as Record<string, unknown>;
  const responseInfo = (data.responseInfo ?? {}) as Record<string, unknown>;
  const criteria = (data.criteria ?? {}) as Record<string, unknown>;

  const result: AssessmentResult = {
    overall: {
      rawAverage: toScore(overall.rawAverage),
      roundedBand: toScore(overall.roundedBand),
      confidence: overall.confidence === "high" || overall.confidence === "medium" ? overall.confidence : "low",
      scoreType: overall.scoreType === "full_test_estimate" ? "full_test_estimate" : "single_answer_estimate",
      englishSummary: String(overall.englishSummary ?? ""),
      thaiSummary: String(overall.thaiSummary ?? ""),
      reliabilityWarning: String(overall.reliabilityWarning ?? ""),
    },
    responseInfo: {
      part: String(responseInfo.part ?? body.mode),
      question: String(responseInfo.question ?? body.question),
      wordCount: Math.max(0, Number(responseInfo.wordCount ?? words)),
      responseLength:
        responseInfo.responseLength === "too short" ||
        responseInfo.responseLength === "short" ||
        responseInfo.responseLength === "adequate" ||
        responseInfo.responseLength === "extended"
          ? responseInfo.responseLength
          : words < 40
            ? "too short"
            : words < 90
              ? "short"
              : words < 170
                ? "adequate"
                : "extended",
      possibleSpeechToTextErrors: Array.isArray(responseInfo.possibleSpeechToTextErrors)
        ? responseInfo.possibleSpeechToTextErrors.map(String)
        : [],
    },
    criteria: {
      fluencyCoherence: normalizeCriterion(criteria.fluencyCoherence),
      lexicalResource: normalizeCriterion(criteria.lexicalResource),
      grammarRangeAccuracy: normalizeCriterion(criteria.grammarRangeAccuracy),
      pronunciation: normalizeCriterion(criteria.pronunciation),
    },
    grammarCorrections: Array.isArray(data.grammarCorrections)
      ? (data.grammarCorrections as Array<Record<string, unknown>>).slice(0, 8).map((row) => ({
          original: String(row.original ?? ""),
          corrected: String(row.corrected ?? ""),
          thaiExplanation: String(row.thaiExplanation ?? ""),
        }))
      : [],
    vocabularyUpgrades: Array.isArray(data.vocabularyUpgrades)
      ? (data.vocabularyUpgrades as Array<Record<string, unknown>>).slice(0, 8).map((row) => ({
          original: String(row.original ?? ""),
          better: String(row.better ?? ""),
          thaiExplanation: String(row.thaiExplanation ?? ""),
        }))
      : [],
    priorityActions: Array.isArray(data.priorityActions)
      ? (data.priorityActions as Array<Record<string, unknown>>).slice(0, 6).map((row) => ({
          english: String(row.english ?? ""),
          thai: String(row.thai ?? ""),
        }))
      : [],
    sampleImprovedAnswer: {
      english: String((data.sampleImprovedAnswer as Record<string, unknown> | undefined)?.english ?? body.transcript),
      thaiNote: String((data.sampleImprovedAnswer as Record<string, unknown> | undefined)?.thaiNote ?? ""),
    },
  };

  result.grammarCorrections = applySpokenCorrectionFilter(result.grammarCorrections);
  if (!result.overall.roundedBand) {
    const avg =
      (result.criteria.fluencyCoherence.band +
        result.criteria.lexicalResource.band +
        result.criteria.grammarRangeAccuracy.band +
        result.criteria.pronunciation.band) /
      4;
    result.overall.rawAverage = Math.round(avg * 10) / 10;
    result.overall.roundedBand = toScore(result.overall.rawAverage);
  }
  if (!result.overall.englishSummary.trim()) {
    throw new Error("Normalized result missing overall.englishSummary");
  }
  if (!result.overall.thaiSummary.trim()) {
    throw new Error("Normalized result missing overall.thaiSummary");
  }
  if (
    !result.criteria.fluencyCoherence.band &&
    !result.criteria.lexicalResource.band &&
    !result.criteria.grammarRangeAccuracy.band &&
    !result.criteria.pronunciation.band
  ) {
    throw new Error("Normalized result missing criterion scores");
  }
  return result;
}

function fallbackAssessment(body: AssessBody, fallbackReason: string, attemptedProviders: string[]): AssessmentResult {
  const words = body.transcript.trim().split(/\s+/).filter(Boolean).length;
  const baseBand = words > 180 ? 6.5 : words > 120 ? 6 : words > 70 ? 5.5 : 5;
  const b = toScore(baseBand);
  return {
    overall: {
      rawAverage: b,
      roundedBand: b,
      confidence: "low",
      scoreType: "single_answer_estimate",
      englishSummary: "Temporary fallback estimate based on transcript length and clarity.",
      thaiSummary: "เป็นคะแนนประมาณการชั่วคราวจากความยาวและความชัดเจนของบทพูด",
      reliabilityWarning: "AI providers were unavailable; this estimate is conservative.",
    },
    responseInfo: {
      part: body.mode,
      question: body.question,
      wordCount: words,
      responseLength: words < 40 ? "too short" : words < 90 ? "short" : words < 170 ? "adequate" : "extended",
      possibleSpeechToTextErrors: [],
    },
    criteria: {
      fluencyCoherence: { band: b, englishExplanation: "Estimated from transcript flow.", thaiExplanation: "ประเมินจากความลื่นไหลของบทพูด", mainIssues: [], howToImprove: { english: [], thai: [] }, evidenceFromTranscript: [] },
      lexicalResource: { band: toScore(b - 0.5), englishExplanation: "Estimated vocabulary range.", thaiExplanation: "ประเมินช่วงคำศัพท์โดยรวม", mainIssues: [], howToImprove: { english: [], thai: [] }, evidenceFromTranscript: [] },
      grammarRangeAccuracy: { band: toScore(b - 0.5), englishExplanation: "Estimated grammar control.", thaiExplanation: "ประเมินความถูกต้องของไวยากรณ์", mainIssues: [], howToImprove: { english: [], thai: [] }, evidenceFromTranscript: [] },
      pronunciation: { band: b, englishExplanation: "Estimated without audio confidence.", thaiExplanation: "ประเมินแบบคร่าวๆ เนื่องจากไม่มีสัญญาณเสียงที่เชื่อถือได้", mainIssues: [], howToImprove: { english: [], thai: [] }, evidence: [] },
    },
    grammarCorrections: [],
    vocabularyUpgrades: [],
    priorityActions: [],
    sampleImprovedAnswer: { english: body.transcript, thaiNote: "ตัวอย่างนี้อิงจากคำตอบเดิม" },
    errorCode: "fallback",
    fallbackReason,
    attemptedProviders,
  };
}

const SIMPLE_PROMPT = `You are an IELTS Speaking examiner.
Return ONE valid JSON object only (no markdown, no extra text).

Rules:
- Evaluate spoken English, not essay writing.
- Do NOT penalize capitalization, punctuation, contractions, fillers, or false starts.
- Give concise bilingual feedback (English + Thai).

JSON shape:
{
  "overall": {"rawAverage":0,"roundedBand":0,"confidence":"low|medium|high","scoreType":"single_answer_estimate","englishSummary":"","thaiSummary":"","reliabilityWarning":""},
  "responseInfo": {"part":"","question":"","wordCount":0,"responseLength":"too short|short|adequate|extended","possibleSpeechToTextErrors":[]},
  "criteria": {
    "fluencyCoherence":{"band":0,"englishExplanation":"","thaiExplanation":"","evidenceFromTranscript":[],"mainIssues":[],"howToImprove":{"english":[],"thai":[]}},
    "lexicalResource":{"band":0,"englishExplanation":"","thaiExplanation":"","evidenceFromTranscript":[],"mainIssues":[],"howToImprove":{"english":[],"thai":[]}},
    "grammarRangeAccuracy":{"band":0,"englishExplanation":"","thaiExplanation":"","evidenceFromTranscript":[],"mainIssues":[],"howToImprove":{"english":[],"thai":[]}},
    "pronunciation":{"band":0,"englishExplanation":"","thaiExplanation":"","evidence":[],"mainIssues":[],"howToImprove":{"english":[],"thai":[]},"limitation":""}
  },
  "grammarCorrections":[{"original":"","corrected":"","thaiExplanation":""}],
  "vocabularyUpgrades":[{"original":"","better":"","thaiExplanation":""}],
  "priorityActions":[{"english":"","thai":""}],
  "sampleImprovedAnswer":{"english":"","thaiNote":""}
}`;

function buildPrompt(body: AssessBody) {
  return `${SIMPLE_PROMPT}

Part: ${body.mode}
Question: ${body.question}
Transcript: ${body.transcript}
Audio metadata: ${body.audioMetadata ? JSON.stringify(body.audioMetadata) : "none"}`;
}

function previewText(text: string, limit = 280) {
  return text.replace(/\s+/g, " ").trim().slice(0, limit);
}

async function callOpenAI(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("OPENAI_API_KEY", "CHATGPT_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing OpenAI key.", "missing_key");
  const model = process.env.OPENAI_SPEAKING_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: prompt, max_output_tokens: 1800 }),
    signal,
  });
  if (!res.ok) throw new ProviderCallError(`OpenAI HTTP ${res.status}`, "http_error", res.status);
  const payload = (await res.json()) as Record<string, unknown>;
  const outputText = typeof payload.output_text === "string" ? payload.output_text : "";
  if (outputText.trim()) return { provider: "openai" as const, model, text: outputText.trim() };
  throw new ProviderCallError("OpenAI empty response.", "empty_response");
}

async function callClaude(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("ANTHROPIC_API_KEY", "CLAUDE_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing Claude key.", "missing_key");
  const model = process.env.ANTHROPIC_SPEAKING_MODEL || "claude-3-5-sonnet-20241022";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      system: "Output exactly one valid JSON object only.",
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });
  if (!res.ok) throw new ProviderCallError(`Claude HTTP ${res.status}`, "http_error", res.status);
  const payload = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = (payload.content ?? [])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text?.trim() ?? "")
    .join("\n")
    .trim();
  if (!text) throw new ProviderCallError("Claude empty response.", "empty_response");
  return { provider: "anthropic" as const, model, text };
}

async function callGemini(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("GEMINI_API_KEY", "GOOGLE_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing Gemini key.", "missing_key");
  const model = process.env.GEMINI_SPEAKING_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { temperature: 0.2, maxOutputTokens: 1800, responseMimeType: "application/json" },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
    signal,
  });
  if (!res.ok) throw new ProviderCallError(`Gemini HTTP ${res.status}`, "http_error", res.status);
  const payload = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => (typeof p.text === "string" ? p.text.trim() : ""))
    .join("\n")
    .trim();
  if (!text) throw new ProviderCallError("Gemini empty response.", "empty_response");
  return { provider: "gemini" as const, model, text };
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(id);
  }
}

export async function POST(req: Request) {
  let body: AssessBody;
  try {
    body = (await req.json()) as AssessBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.transcript?.trim() || !body.question?.trim()) {
    return NextResponse.json({ error: "question and transcript are required." }, { status: 400 });
  }

  const prompt = buildPrompt(body);
  const providers: Array<{
    id: ProviderId;
    configured: boolean;
    model: string;
    run: () => Promise<ProviderResponse>;
  }> = [
    {
      id: "gemini",
      configured: Boolean(firstEnv("GEMINI_API_KEY", "GOOGLE_API_KEY")),
      model: process.env.GEMINI_SPEAKING_MODEL || "gemini-2.5-flash",
      run: () => withTimeout((signal) => callGemini(prompt, signal)),
    },
    {
      id: "anthropic",
      configured: Boolean(firstEnv("ANTHROPIC_API_KEY", "CLAUDE_API_KEY")),
      model: process.env.ANTHROPIC_SPEAKING_MODEL || "claude-3-5-sonnet-20241022",
      run: () => withTimeout((signal) => callClaude(prompt, signal)),
    },
    {
      id: "openai",
      configured: Boolean(firstEnv("OPENAI_API_KEY", "CHATGPT_API_KEY")),
      model: process.env.OPENAI_SPEAKING_MODEL || "gpt-4o-mini",
      run: () => withTimeout((signal) => callOpenAI(prompt, signal)),
    },
  ];
  const selectedProviders = body.forceProvider
    ? providers.filter((provider) => provider.id === body.forceProvider)
    : providers;

  if (body.forceProvider && selectedProviders.length === 0) {
    return NextResponse.json({ error: `Unsupported provider: ${body.forceProvider}` }, { status: 400 });
  }

  const diagnostics: ProviderDiagnostic[] = selectedProviders.map((provider) => ({
    provider: provider.id,
    configured: provider.configured,
    attempted: false,
    ok: false,
    model: provider.model,
    stage: "config",
    code: provider.configured ? undefined : "missing_key",
    message: provider.configured ? undefined : `Missing API key for ${provider.id}.`,
  }));

  if (!selectedProviders.some((provider) => provider.configured)) {
    return NextResponse.json(
      {
        error: body.forceProvider
          ? `No API key configured for ${body.forceProvider}.`
          : "No AI speaking provider is configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.",
        providerFailures: diagnostics.map((item) => `${item.provider}:${item.message ?? item.code ?? "unavailable"}`),
        attemptedProviders: [],
        providerDiagnostics: diagnostics,
      },
      { status: 503 },
    );
  }

  const failures: string[] = [];
  const attempted: string[] = [];

  for (const provider of selectedProviders) {
    const diagnostic = diagnostics.find((item) => item.provider === provider.id);
    if (!provider.configured) {
      failures.push(`${provider.id}:Missing API key.`);
      continue;
    }
    try {
      attempted.push(provider.id);
      if (diagnostic) diagnostic.attempted = true;
      if (diagnostic) diagnostic.stage = "request";
      const output = await provider.run();
      if (diagnostic) {
        diagnostic.stage = "response";
        diagnostic.responsePreview = previewText(output.text);
      }
      let parsed: Record<string, unknown>;
      try {
        if (diagnostic) diagnostic.stage = "parse";
        parsed = parseJsonObject(output.text);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown parse error";
        if (diagnostic) {
          diagnostic.code = "parse_error";
          diagnostic.message = msg;
        }
        throw new ProviderCallError(msg, "parse_error");
      }
      let normalized: AssessmentResult;
      try {
        if (diagnostic) diagnostic.stage = "normalize";
        normalized = normalizeAssessmentResult(body, parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown normalization error";
        if (diagnostic) {
          diagnostic.code = "normalize_error";
          diagnostic.message = msg;
        }
        throw new ProviderCallError(msg, "normalize_error");
      }
      normalized.feedbackSource = output.provider;
      normalized.feedbackModel = output.model;
      normalized.providerFailures = failures;
      normalized.providerDiagnostics = diagnostics;
      if (diagnostic) {
        diagnostic.ok = true;
        diagnostic.stage = "normalize";
        diagnostic.message = "Success";
      }
      return NextResponse.json(normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_error";
      const code = err instanceof ProviderCallError ? err.code : "unknown_error";
      failures.push(`${provider.id}:${msg}`);
      if (diagnostic) {
        if (!diagnostic.stage || diagnostic.stage === "config") diagnostic.stage = "request";
        diagnostic.code = code;
        diagnostic.message = msg;
        diagnostic.status = err instanceof ProviderCallError ? err.status : undefined;
      }
      console.error("[speaking-assess] provider failed", {
        provider: provider.id,
        stage: diagnostic?.stage ?? "request",
        code,
        status: err instanceof ProviderCallError ? err.status : undefined,
        message: msg,
        model: provider.model,
        responsePreview: diagnostic?.responsePreview,
      });
      // Try next provider in fixed order.
    }
  }

  return NextResponse.json(
    {
      ...fallbackAssessment(
        body,
        failures.length ? failures.join(" | ") : "All providers failed with unknown errors.",
        attempted,
      ),
      providerFailures: failures,
      providerDiagnostics: diagnostics,
    },
  );
}
