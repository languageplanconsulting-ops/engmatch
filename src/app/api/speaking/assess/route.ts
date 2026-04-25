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

export type BilingualBullet = {
  thai: string;
  english: string;
};

export type BucketChecklist = {
  currentBand: number;
  nextTargetBand: number;
  achieved: BilingualBullet[];
  missingForNextBand: BilingualBullet[];
};

export type StepUpCorrection = {
  type: "grammar" | "vocabulary" | "fluency";
  targetBand: number;
  originalText?: string;
  improvedText?: string;
  suggestionToAdd?: string;
  englishExplanation: string;
  thaiExplanation: string;
};

export type AssessmentReportCard = {
  topicName: string;
  preprocess: {
    rawTranscript: string;
    punctuatedTranscript: string;
  };
  scoreCalculation: {
    grammar: number;
    vocabulary: number;
    fluency: number;
    pronunciation: number;
    exactAverage: number;
    roundedBand: number;
    formula: string;
    pronunciationConfidencePct: number | null;
  };
  buckets: {
    grammar: BucketChecklist;
    vocabulary: BucketChecklist;
    fluency: BucketChecklist;
  };
  stepUpCorrections: StepUpCorrection[];
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
  reportCard: AssessmentReportCard;
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

type WhisperAudioMetadata = {
  source?: string;
  model?: string;
  language?: string;
  durationSec?: number | null;
  segmentCount?: number | null;
  avgLogprob?: number | null;
  avgNoSpeechProb?: number | null;
  wordsPerMinute?: number | null;
  whisperTranscriptPreview?: string;
};

function parseWhisperAudioMetadata(input: unknown): WhisperAudioMetadata | null {
  if (!input || typeof input !== "object") return null;
  const n = input as Record<string, unknown>;
  return {
    source: typeof n.source === "string" ? n.source : undefined,
    model: typeof n.model === "string" ? n.model : undefined,
    language: typeof n.language === "string" ? n.language : undefined,
    durationSec: typeof n.durationSec === "number" ? n.durationSec : null,
    segmentCount: typeof n.segmentCount === "number" ? n.segmentCount : null,
    avgLogprob: typeof n.avgLogprob === "number" ? n.avgLogprob : null,
    avgNoSpeechProb: typeof n.avgNoSpeechProb === "number" ? n.avgNoSpeechProb : null,
    wordsPerMinute: typeof n.wordsPerMinute === "number" ? n.wordsPerMinute : null,
    whisperTranscriptPreview: typeof n.whisperTranscriptPreview === "string" ? n.whisperTranscriptPreview : "",
  };
}

function punctuateTranscript(raw: string) {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const segments = normalized
    .split(/(?<=\b(?:because|but|so|and then|after that|however|finally|also|then)\b)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const merged = (segments.length ? segments : [normalized]).map((segment) => {
    const sentence = segment.charAt(0).toUpperCase() + segment.slice(1);
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  });
  return merged.join(" ");
}

function toBucketBand(v: unknown) {
  const n = Math.round(typeof v === "number" ? v : Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.max(5, Math.min(9, n));
}

function roundOverallBand(rawAverage: number) {
  const clamped = Math.max(0, Math.min(9, rawAverage));
  const whole = Math.floor(clamped);
  const decimal = clamped - whole;
  if (decimal <= 0.25) return whole;
  if (decimal < 0.75) return whole + 0.5;
  return Math.min(9, whole + 1);
}

function countReferences(text: string) {
  return (text.toLowerCase().match(/\b(this|that|those|these)\b/g) ?? []).length;
}

function estimatePronunciationConfidence(transcript: string, audioMetadata: WhisperAudioMetadata | null) {
  if (audioMetadata) {
    let confidence = 82;
    if (typeof audioMetadata.avgLogprob === "number") confidence += (audioMetadata.avgLogprob + 0.9) * 18;
    if (typeof audioMetadata.avgNoSpeechProb === "number") confidence -= audioMetadata.avgNoSpeechProb * 20;
    if (typeof audioMetadata.wordsPerMinute === "number") {
      const wpm = audioMetadata.wordsPerMinute;
      if (wpm >= 110 && wpm <= 175) confidence += 6;
      else if (wpm < 85 || wpm > 210) confidence -= 8;
    }
    return Math.max(55, Math.min(98, Math.round(confidence)));
  }

  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const fillerCount = (transcript.toLowerCase().match(/\b(uh|um|like|you know)\b/g) ?? []).length;
  const shortWordRatio = words.length
    ? words.filter((word) => word.length <= 2).length / words.length
    : 0;
  let confidence = words.length > 220 ? 84 : words.length > 160 ? 80 : words.length > 100 ? 76 : 70;
  confidence -= fillerCount > 10 ? 4 : 0;
  confidence -= shortWordRatio > 0.4 ? 3 : 0;
  return Math.max(60, Math.min(88, Math.round(confidence)));
}

function pronunciationBandFromConfidence(confidencePct: number) {
  if (confidencePct >= 96) return 9;
  if (confidencePct >= 90) return 8.5;
  if (confidencePct >= 80) return 7;
  if (confidencePct >= 70) return 6;
  return 5;
}

function normalizeBilingualBullets(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const thai = String(row.thai ?? "").trim();
      const english = String(row.english ?? "").trim();
      if (!thai && !english) return null;
      return { thai, english };
    })
    .filter((item): item is BilingualBullet => Boolean(item));
}

function normalizeBucketChecklist(input: unknown, fallbackBand: number) {
  const row = (input ?? {}) as Record<string, unknown>;
  const currentBand = toBucketBand(row.currentBand ?? fallbackBand);
  const nextTargetBand = Math.min(9, Math.max(currentBand + 1, toBucketBand(row.nextTargetBand ?? currentBand + 1)));
  return {
    currentBand,
    nextTargetBand,
    achieved: normalizeBilingualBullets(row.achieved),
    missingForNextBand: normalizeBilingualBullets(row.missingForNextBand),
  };
}

function normalizeStepUpCorrections(input: unknown) {
  if (!Array.isArray(input)) return [];
  const rows = input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const type: StepUpCorrection["type"] =
        row.type === "fluency" || row.type === "grammar" || row.type === "vocabulary" ? row.type : "grammar";
      return {
        type,
        targetBand: toBucketBand(row.targetBand ?? 7),
        originalText: typeof row.originalText === "string" ? row.originalText : undefined,
        improvedText: typeof row.improvedText === "string" ? row.improvedText : undefined,
        suggestionToAdd: typeof row.suggestionToAdd === "string" ? row.suggestionToAdd : undefined,
        englishExplanation: String(row.englishExplanation ?? ""),
        thaiExplanation: String(row.thaiExplanation ?? ""),
      };
    })
    .filter((item) => item !== null);
  return rows.slice(0, 5) as StepUpCorrection[];
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

function buildPronunciationCriterion(confidencePct: number, audioMetadata: WhisperAudioMetadata | null): CriterionDetail {
  const band = pronunciationBandFromConfidence(confidencePct);
  const evidence = [
    `Estimated pronunciation confidence: ${confidencePct}%`,
    audioMetadata?.avgLogprob !== null && audioMetadata?.avgLogprob !== undefined
      ? `Whisper avg logprob: ${audioMetadata.avgLogprob.toFixed(3)}`
      : "Whisper confidence metadata unavailable; estimated from transcript clarity.",
  ];
  if (typeof audioMetadata?.avgNoSpeechProb === "number") {
    evidence.push(`Whisper no-speech probability: ${audioMetadata.avgNoSpeechProb.toFixed(3)}`);
  }
  if (typeof audioMetadata?.wordsPerMinute === "number") {
    evidence.push(`Estimated speaking rate: ${audioMetadata.wordsPerMinute} words/minute`);
  }
  return {
    band,
    englishExplanation:
      band >= 7
        ? "Pronunciation appears generally clear enough for comfortable listening, based on Whisper confidence logic."
        : "Pronunciation clarity is still limiting listener comfort under the Whisper confidence logic.",
    thaiExplanation:
      band >= 7
        ? "การออกเสียงโดยรวมค่อนข้างชัดและฟังตามได้สบาย ตามตรรกะคะแนนความมั่นใจของ Whisper"
        : "ความชัดของการออกเสียงยังลดความสบายในการฟัง ตามตรรกะคะแนนความมั่นใจของ Whisper",
    evidence,
    mainIssues:
      band >= 7
        ? ["Keep word stress and pacing consistent."]
        : ["Some sounds or pacing likely reduce recognizability."],
    howToImprove: {
      english: [
        "Shadow one 30-second section and exaggerate stressed words.",
        "Slow down slightly on key nouns and verbs to improve recognizability.",
      ],
      thai: [
        "ฝึก shadowing ทีละ 30 วินาที และเน้น stress ของคำสำคัญให้ชัดขึ้น",
        "ชะลอเล็กน้อยในคำนามและคำกริยาหลักเพื่อให้ผู้ฟังจับคำได้ง่ายขึ้น",
      ],
    },
    limitation: audioMetadata
      ? "Pronunciation band uses Whisper-style confidence logic rather than a full human phonetic review."
      : "Pronunciation band is estimated from transcript clarity because audio confidence metadata was not provided.",
  };
}

function normalizeAssessmentResult(body: AssessBody, data: Record<string, unknown>): AssessmentResult {
  const words = body.transcript.trim().split(/\s+/).filter(Boolean).length;
  const responseInfo = (data.responseInfo ?? {}) as Record<string, unknown>;
  const criteria = (data.criteria ?? {}) as Record<string, unknown>;
  const preprocess = ((data.preprocess ?? data.preprocessing) ?? {}) as Record<string, unknown>;
  const buckets = (data.buckets ?? {}) as Record<string, unknown>;
  const fluencyCriteria = (criteria.fluencyCoherence ?? {}) as Record<string, unknown>;
  const vocabularyCriteria = (criteria.lexicalResource ?? {}) as Record<string, unknown>;
  const grammarCriteria = (criteria.grammarRangeAccuracy ?? {}) as Record<string, unknown>;
  const audioMetadata = parseWhisperAudioMetadata(body.audioMetadata);
  const pronunciationConfidencePct = estimatePronunciationConfidence(body.transcript, audioMetadata);
  const fluencyBand = toBucketBand((buckets.fluency as Record<string, unknown> | undefined)?.currentBand ?? fluencyCriteria.band);
  const vocabularyBand = toBucketBand((buckets.vocabulary as Record<string, unknown> | undefined)?.currentBand ?? vocabularyCriteria.band);
  const grammarBand = toBucketBand((buckets.grammar as Record<string, unknown> | undefined)?.currentBand ?? grammarCriteria.band);
  const pronunciation = buildPronunciationCriterion(pronunciationConfidencePct, audioMetadata);
  const rawAverage = Number(((fluencyBand + vocabularyBand + grammarBand + pronunciation.band) / 4).toFixed(2));
  const roundedBand = roundOverallBand(rawAverage);
  const fluencyChecklist = normalizeBucketChecklist(buckets.fluency, fluencyBand);
  const vocabularyChecklist = normalizeBucketChecklist(buckets.vocabulary, vocabularyBand);
  const grammarChecklist = normalizeBucketChecklist(buckets.grammar, grammarBand);
  const punctuatedTranscript =
    typeof preprocess.punctuatedTranscript === "string" && preprocess.punctuatedTranscript.trim()
      ? preprocess.punctuatedTranscript.trim()
      : punctuateTranscript(body.transcript);
  const reportCard: AssessmentReportCard = {
    topicName: body.question,
    preprocess: {
      rawTranscript: body.transcript,
      punctuatedTranscript,
    },
    scoreCalculation: {
      grammar: grammarBand,
      vocabulary: vocabularyBand,
      fluency: fluencyBand,
      pronunciation: pronunciation.band,
      exactAverage: rawAverage,
      roundedBand,
      formula: `(${fluencyBand} + ${grammarBand} + ${vocabularyBand} + ${pronunciation.band}) / 4 = ${rawAverage}`,
      pronunciationConfidencePct,
    },
    buckets: {
      grammar: grammarChecklist,
      vocabulary: vocabularyChecklist,
      fluency: fluencyChecklist,
    },
    stepUpCorrections: normalizeStepUpCorrections(data.stepUpCorrections),
  };

  const result: AssessmentResult = {
    overall: {
      rawAverage,
      roundedBand,
      confidence: words > 240 ? "high" : words > 170 ? "medium" : "low",
      scoreType: "single_answer_estimate",
      englishSummary: String((data.overall as Record<string, unknown> | undefined)?.englishSummary ?? ""),
      thaiSummary: String((data.overall as Record<string, unknown> | undefined)?.thaiSummary ?? ""),
      reliabilityWarning: String(
        (data.overall as Record<string, unknown> | undefined)?.reliabilityWarning ??
          "Grammar, vocabulary, and fluency use the bucket rubric; pronunciation uses Whisper-confidence logic.",
      ),
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
      fluencyCoherence: {
        ...normalizeCriterion(criteria.fluencyCoherence),
        band: fluencyBand,
      },
      lexicalResource: {
        ...normalizeCriterion(criteria.lexicalResource),
        band: vocabularyBand,
      },
      grammarRangeAccuracy: {
        ...normalizeCriterion(criteria.grammarRangeAccuracy),
        band: grammarBand,
      },
      pronunciation,
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
    reportCard,
  };

  result.grammarCorrections = applySpokenCorrectionFilter(result.grammarCorrections);
  if (!result.overall.englishSummary.trim()) {
    result.overall.englishSummary = `Estimated overall band ${roundedBand.toFixed(1)}. Grammar ${grammarBand}, vocabulary ${vocabularyBand}, fluency ${fluencyBand}, pronunciation ${pronunciation.band}.`;
  }
  if (!result.overall.thaiSummary.trim()) {
    result.overall.thaiSummary = `คะแนนรวมประมาณ ${roundedBand.toFixed(1)} โดยได้ Grammar ${grammarBand}, Vocabulary ${vocabularyBand}, Fluency ${fluencyBand} และ Pronunciation ${pronunciation.band}`;
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
  const punctuatedTranscript = punctuateTranscript(body.transcript);
  const pronunciationConfidencePct = estimatePronunciationConfidence(body.transcript, null);
  const pronunciation = buildPronunciationCriterion(pronunciationConfidencePct, null);
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
      pronunciation,
    },
    grammarCorrections: [],
    vocabularyUpgrades: [],
    priorityActions: [],
    sampleImprovedAnswer: { english: body.transcript, thaiNote: "ตัวอย่างนี้อิงจากคำตอบเดิม" },
    reportCard: {
      topicName: body.question,
      preprocess: {
        rawTranscript: body.transcript,
        punctuatedTranscript,
      },
      scoreCalculation: {
        grammar: toBucketBand(b - 0.5),
        vocabulary: toBucketBand(b - 0.5),
        fluency: toBucketBand(b),
        pronunciation: pronunciation.band,
        exactAverage: Number((((toBucketBand(b) + toBucketBand(b - 0.5) + toBucketBand(b - 0.5) + pronunciation.band) / 4)).toFixed(2)),
        roundedBand: b,
        formula: `(${toBucketBand(b)} + ${toBucketBand(b - 0.5)} + ${toBucketBand(b - 0.5)} + ${pronunciation.band}) / 4`,
        pronunciationConfidencePct,
      },
      buckets: {
        grammar: {
          currentBand: toBucketBand(b - 0.5),
          nextTargetBand: Math.min(9, toBucketBand(b - 0.5) + 1),
          achieved: [{ thai: "ระบบยังให้ได้เพียงคะแนนประมาณการชั่วคราว", english: "Only a temporary estimate is available right now." }],
          missingForNextBand: [{ thai: "ต้องให้ AI ประเมินจริงอีกครั้งหลังระบบพร้อม", english: "Run a full AI assessment again when the provider is available." }],
        },
        vocabulary: {
          currentBand: toBucketBand(b - 0.5),
          nextTargetBand: Math.min(9, toBucketBand(b - 0.5) + 1),
          achieved: [{ thai: "มีโครงคำตอบพอให้ประมาณระดับได้คร่าว ๆ", english: "There is enough content to estimate a rough level." }],
          missingForNextBand: [{ thai: "ต้องมีการตรวจ collocation แบบเต็มโดย AI", english: "A full AI collocation check is still needed." }],
        },
        fluency: {
          currentBand: toBucketBand(b),
          nextTargetBand: Math.min(9, toBucketBand(b) + 1),
          achieved: [{ thai: `มีคำประมาณ ${words} คำ`, english: `The response contains about ${words} words.` }],
          missingForNextBand: [{ thai: "ต้องให้ AI วิเคราะห์ referencing และ self-correction แบบเต็ม", english: "A full AI analysis of referencing and self-correction is still needed." }],
        },
      },
      stepUpCorrections: [],
    },
    errorCode: "fallback",
    fallbackReason,
    attemptedProviders,
  };
}

const SIMPLE_PROMPT = `ROLE AND OBJECTIVE
You are an expert IELTS Speaking Examiner.
Return ONE valid JSON object only. No markdown. No prose outside JSON.

STEP 1: SCRIPT PRE-PROCESSING
- Mentally add punctuation to the raw ASR transcript to establish natural sentence boundaries.
- Do NOT punish the candidate for ASR run-on text.
- Ignore false starts and self-repairs unless they clearly damage meaning.
- You must return both the raw transcript and your punctuated transcript.

STEP 2: SCORING RUBRIC
- Score ONLY grammar, vocabulary, and fluency using the bucket rules below.
- Pronunciation will be computed separately by the server, so do NOT score pronunciation in your JSON.
- Use strict bucket logic. A band should match the bucket actually achieved, not a soft average feeling.

GRAMMAR BUCKET
- Band 9: Uses conditionals, perfect tenses, and past tenses correctly. Uses subordinating conjunctions. No grammar mistakes.
- Band 8: Uses perfect and past tenses. Uses subordinating conjunctions. No systematic grammar mistakes.
- Band 7: Uses simple tenses correctly. Uses subordinating conjunctions. Minor mistakes acceptable, no more than 3 total.
- Band 6: No more than 3 mistakes in simple tenses. Mistakes in past tense or subordinating conjunctions, or lacks them. More than 5 mistakes total, but understanding remains clear.
- Band 5: Mistakes in simple tense. Fails to transition tenses. More than 5 mistakes that hinder understanding.

VOCABULARY BUCKET
- Band 9: More than 6 B1+ collocations, including at least 2 C1-C2 collocations, with no awkward use.
- Band 8: 4-5 B1+ collocations, including at least 1 C1-C2 collocation, with no awkward use.
- Band 7: 2-5 collocations, no severe mistakes, and no more than 3 awkward phrases.
- Band 6: Mostly A2-B1 vocabulary. Awkward mistakes appear throughout, but meaning is still clear.
- Band 5: A2-B1 vocabulary. Mistakes cause more than 2-3 sentences to fail in meaning.

FLUENCY BUCKET
- Band 9: More than 310 words. Uses referencing words like this/that/those more than 4 times. No hesitation or self-correction.
- Band 8: More than 280 words. Uses referencing more than 3 times. Any self-correction is correct.
- Band 7: More than 250 words. Uses referencing more than 2 times. Self-corrections are mostly correct.
- Band 6: 200-250 words. No or poor referencing. Self-corrections often wrong.
- Band 5: Fewer than 200 words. No referencing. Self-corrections are mostly wrong.

OUTPUT REQUIREMENTS
- Thai first, English second in bilingual fields.
- Be specific and evidence-based.
- Step-up corrections must target ONLY the missing buckets for the next band.
- For grammar and vocabulary corrections, return originalText and improvedText.
- For fluency corrections, return suggestionToAdd instead of originalText/improvedText when the gap is word count or extension.
- Keep the output compact.
- Use at most 2 achieved bullets per bucket.
- Use at most 2 missing bullets per bucket.
- Return exactly 3 stepUpCorrections.
- Keep each explanation under 18 words.
- Keep criteria evidence arrays to max 2 items each.
- Keep grammarCorrections and vocabularyUpgrades to max 3 items each.
- sampleImprovedAnswer.english must be 80-120 words maximum.

JSON SHAPE
{
  "overall": {"englishSummary":"","thaiSummary":"","reliabilityWarning":""},
  "responseInfo": {"part":"","question":"","wordCount":0,"responseLength":"too short|short|adequate|extended","possibleSpeechToTextErrors":[]},
  "preprocess": {"rawTranscript":"","punctuatedTranscript":""},
  "criteria": {
    "grammarRangeAccuracy":{"band":0,"englishExplanation":"","thaiExplanation":"","evidenceFromTranscript":[],"mainIssues":[],"howToImprove":{"english":[],"thai":[]}},
    "lexicalResource":{"band":0,"englishExplanation":"","thaiExplanation":"","evidenceFromTranscript":[],"mainIssues":[],"howToImprove":{"english":[],"thai":[]}},
    "fluencyCoherence":{"band":0,"englishExplanation":"","thaiExplanation":"","evidenceFromTranscript":[],"mainIssues":[],"howToImprove":{"english":[],"thai":[]}}
  },
  "buckets": {
    "grammar":{"currentBand":0,"nextTargetBand":0,"achieved":[{"thai":"","english":""}],"missingForNextBand":[{"thai":"","english":""}]},
    "vocabulary":{"currentBand":0,"nextTargetBand":0,"achieved":[{"thai":"","english":""}],"missingForNextBand":[{"thai":"","english":""}]},
    "fluency":{"currentBand":0,"nextTargetBand":0,"achieved":[{"thai":"","english":""}],"missingForNextBand":[{"thai":"","english":""}]}
  },
  "stepUpCorrections":[{"type":"grammar|vocabulary|fluency","targetBand":0,"originalText":"","improvedText":"","suggestionToAdd":"","englishExplanation":"","thaiExplanation":""}],
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
    body: JSON.stringify({ model, input: prompt, max_output_tokens: 3200 }),
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
      max_tokens: 3200,
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
      generationConfig: { temperature: 0.2, maxOutputTokens: 3200, responseMimeType: "application/json" },
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
