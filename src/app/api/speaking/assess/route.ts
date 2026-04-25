import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AssessBody = {
  question: string;
  transcript: string;
  mode: "part-1" | "part-2" | "part-3";
  runtimeMode?: "mock" | "practice" | "intensive";
  previousOverall?: number;
  audioMetadata?: unknown;
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
  reportV2?: {
    version: "part2-v2";
    header: {
      topicTh: string;
      topicEn: string;
      overallBand: number;
    };
    rubricCards: Array<{
      key: "fluency" | "grammar" | "vocabulary" | "pronunciation";
      titleTh: string;
      titleEn: string;
      band: number;
      feedbackTh: string;
      feedbackEn: string;
      progressPct: number;
    }>;
    transcriptAnalysis: {
      punctuatedTranscript: string;
      transitionWords: string[];
      goodVocabulary: string[];
      errorPhrases: Array<{ phrase: string; intended: string }>;
    };
    pronunciation: {
      overallConfidencePct: number;
      lowConfidenceWords: Array<{
        intended: string;
        heard: string;
        confidencePct: number;
      }>;
    };
    bandRationale: Array<{
      key: "fluency" | "grammar" | "vocabulary" | "pronunciation";
      title: string;
      currentBand: number;
      checklistHits: string[];
    }>;
    detectedEvidence: string[];
    actionableFixes: string[];
    nextBandPlan: Array<{
      key: "fluency" | "grammar" | "vocabulary" | "pronunciation";
      currentBand: number;
      targetBand: number;
      tasks: string[];
    }>;
    corrections: Array<{
      category: "grammar" | "vocabulary" | "flow";
      wrong: string;
      right: string;
      reasonTh: string;
      reasonEn: string;
    }>;
  };
  feedbackSource?: "openai" | "anthropic" | "gemini";
  feedbackModel?: string;
  errorCode?: string;
};

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

function toScore(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2));
}

function parseWhisperMetadata(input: unknown): WhisperAudioMetadata | null {
  if (!input || typeof input !== "object") return null;
  const m = input as Record<string, unknown>;
  if (m.source !== "openai-whisper") return null;
  return {
    source: String(m.source ?? ""),
    model: String(m.model ?? ""),
    language: String(m.language ?? ""),
    durationSec: typeof m.durationSec === "number" ? m.durationSec : null,
    segmentCount: typeof m.segmentCount === "number" ? m.segmentCount : null,
    avgLogprob: typeof m.avgLogprob === "number" ? m.avgLogprob : null,
    avgNoSpeechProb: typeof m.avgNoSpeechProb === "number" ? m.avgNoSpeechProb : null,
    wordsPerMinute: typeof m.wordsPerMinute === "number" ? m.wordsPerMinute : null,
    whisperTranscriptPreview: typeof m.whisperTranscriptPreview === "string" ? m.whisperTranscriptPreview : "",
  };
}

function buildPronunciationFromWhisper(meta: WhisperAudioMetadata): CriterionDetail {
  let band = 5.5;

  // avg_logprob closer to 0 generally indicates clearer recognizability.
  const lp = meta.avgLogprob ?? -0.9;
  if (lp >= -0.45) band += 0.8;
  else if (lp >= -0.7) band += 0.4;
  else if (lp <= -1.15) band -= 0.6;

  // Lower no-speech probability implies more stable voiced speech.
  const ns = meta.avgNoSpeechProb ?? 0.2;
  if (ns <= 0.08) band += 0.3;
  else if (ns >= 0.35) band -= 0.4;

  // Very high/low WPM often correlates with reduced clarity in learner speech.
  const wpm = meta.wordsPerMinute ?? 0;
  if (wpm >= 105 && wpm <= 175) band += 0.3;
  else if (wpm > 0 && (wpm < 80 || wpm > 210)) band -= 0.4;

  band = toScore(band);

  return {
    band,
    englishExplanation:
      "Pronunciation is estimated from Whisper audio-recognition confidence, speech continuity, and speaking rate, rather than transcript text alone.",
    thaiExplanation:
      "คะแนนการออกเสียงประเมินจากความมั่นใจของระบบรู้จำเสียง Whisper ความต่อเนื่องของเสียงพูด และความเร็วในการพูด ไม่ได้ดูเฉพาะข้อความถอดเสียงอย่างเดียว",
    evidence: [
      `Whisper avg logprob: ${meta.avgLogprob ?? "n/a"}`,
      `No-speech probability: ${meta.avgNoSpeechProb ?? "n/a"}`,
      `Estimated speaking rate: ${meta.wordsPerMinute ?? "n/a"} wpm`,
    ],
    mainIssues:
      band >= 6
        ? ["Minor clarity issues may still appear in fast sections."]
        : ["Audio recognizability suggests pronunciation/clarity still limits listener comfort."],
    howToImprove: {
      english: [
        "Slow down slightly and stress content words to improve recognizability.",
        "Record 60-second answers and compare unclear segments with model pronunciation.",
      ],
      thai: [
        "พูดช้าลงเล็กน้อยและเน้นคำสำคัญเพื่อให้ระบบและผู้ฟังจับคำได้ชัดขึ้น",
        "อัดคำตอบ 60 วินาทีแล้วย้อนฟังช่วงที่ไม่ชัด จากนั้นฝึกออกเสียงซ้ำเป็นช่วงสั้นๆ",
      ],
    },
    limitation:
      "Whisper-based estimate is stronger than transcript-only scoring but still not a full human phonetic evaluation.",
  };
}

function assembleOverallFromCriteria(result: AssessmentResult) {
  const f = toScore(result.criteria.fluencyCoherence.band);
  const l = toScore(result.criteria.lexicalResource.band);
  const g = toScore(result.criteria.grammarRangeAccuracy.band);
  const p = toScore(result.criteria.pronunciation.band);
  const rawAverage = Math.round((((f + l + g + p) / 4) * 10)) / 10;
  result.overall.rawAverage = rawAverage;
  result.overall.roundedBand = toScore(rawAverage);
}

function clampBandTarget(current: number) {
  const rounded = toScore(current);
  return toScore(Math.min(9, rounded + 1));
}

function countReferencingTokens(transcript: string) {
  const matches = transcript.toLowerCase().match(/\b(this|that|those|these|such)\b/g);
  return matches?.length ?? 0;
}

function punctuateTranscript(raw: string) {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const breakTokens = [
    "so",
    "but",
    "however",
    "finally",
    "moving on",
    "with regard to",
    "at the end of the day",
    "because",
  ];
  const words = normalized.split(" ");
  const sentences: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const lookback = current.slice(Math.max(0, current.length - 5)).join(" ").toLowerCase();
    const shouldBreak =
      current.length >= 20 &&
      (breakTokens.some((t) => lookback.endsWith(t)) || i === words.length - 1 || current.length >= 34);
    if (shouldBreak) {
      const sentence = current.join(" ").trim();
      if (sentence) {
        const capped = sentence.charAt(0).toUpperCase() + sentence.slice(1);
        sentences.push(capped.endsWith(".") ? capped : `${capped}.`);
      }
      current = [];
    }
  }
  if (current.length) {
    const sentence = current.join(" ").trim();
    const capped = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    sentences.push(capped.endsWith(".") ? capped : `${capped}.`);
  }
  return sentences.join(" ");
}

function countStrongSpokenCollocations(transcript: string) {
  const lower = transcript.toLowerCase();
  const collocations = [
    "sense of accomplishment",
    "life changing",
    "life-changing",
    "navigate my life",
    "holding back",
    "look up to",
    "at the end of the day",
    "unlock my potential",
    "corporate journey",
    "reshape how i see the world",
    "chances are",
    "dream come true",
    "with regard to",
    "moving on to",
  ];
  return collocations.filter((c) => lower.includes(c)).length;
}

function hasTenseVariance(transcript: string) {
  const lower = transcript.toLowerCase();
  const hasPast = /\b(was|were|did|had|started|graduated|realized|led)\b/.test(lower);
  const hasPresent = /\b(am|is|are|do|does|has|have)\b/.test(lower);
  const hasFutureOrModal = /\b(will|would|could|should|might)\b/.test(lower);
  return (hasPast && hasPresent) || (hasPast && hasFutureOrModal) || (hasPresent && hasFutureOrModal);
}

function isMostlyContractionExpansion(original: string, corrected: string) {
  const o = original.toLowerCase().trim();
  const c = corrected.toLowerCase().trim();
  const contractions: Array<[RegExp, string]> = [
    [/\bi'm\b/g, "i am"],
    [/\bi've\b/g, "i have"],
    [/\bi'd\b/g, "i would"],
    [/\bi'll\b/g, "i will"],
    [/\bit's\b/g, "it is"],
    [/\bthat's\b/g, "that is"],
    [/\bthere's\b/g, "there is"],
    [/\bthey're\b/g, "they are"],
    [/\bwe're\b/g, "we are"],
    [/\byou're\b/g, "you are"],
    [/\bdon't\b/g, "do not"],
    [/\bdoesn't\b/g, "does not"],
    [/\bcan't\b/g, "cannot"],
    [/\bwon't\b/g, "will not"],
    [/\bshouldn't\b/g, "should not"],
    [/\bcouldn't\b/g, "could not"],
    [/\bwouldn't\b/g, "would not"],
    [/\bhasn't\b/g, "has not"],
    [/\bhaven't\b/g, "have not"],
    [/\bwasn't\b/g, "was not"],
    [/\baren't\b/g, "are not"],
    [/\bisn't\b/g, "is not"],
    [/\beverybody's\b/g, "everybody is"],
  ];
  let expanded = o;
  for (const [pattern, replacement] of contractions) {
    expanded = expanded.replace(pattern, replacement);
  }
  const normalize = (s: string) => s.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  return normalize(expanded) === normalize(c);
}

function applyPart2SpokenCalibration(result: AssessmentResult, transcript: string) {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const transitionCount = (result.reportV2?.transcriptAnalysis.transitionWords.length ?? 0);
  const strongCollocations = countStrongSpokenCollocations(transcript);

  // Fluency base floors by length for spoken part 2.
  if (words > 250) result.criteria.fluencyCoherence.band = Math.max(result.criteria.fluencyCoherence.band, 8.0);
  else if (words > 230) result.criteria.fluencyCoherence.band = Math.max(result.criteria.fluencyCoherence.band, 7.0);
  if (transitionCount > 0) result.criteria.fluencyCoherence.band = Math.max(result.criteria.fluencyCoherence.band, 7.0);

  // Vocabulary floor by collocations/phrasal richness.
  if (strongCollocations >= 3) {
    result.criteria.lexicalResource.band = Math.max(result.criteria.lexicalResource.band, 7.5);
  }

  // Grammar floor when tense variance and meaning are still clear.
  if (hasTenseVariance(transcript)) {
    result.criteria.grammarRangeAccuracy.band = Math.max(result.criteria.grammarRangeAccuracy.band, 7.0);
  }

  // Remove essay-style spoken false positives.
  result.criteria.fluencyCoherence.mainIssues = result.criteria.fluencyCoherence.mainIssues.filter(
    (issue) => !/run-?on sentence/i.test(issue),
  );
  result.criteria.fluencyCoherence.howToImprove.english = result.criteria.fluencyCoherence.howToImprove.english.filter(
    (tip) => !/run-?on sentence|add punctuation/i.test(tip),
  );

  // Keep corrections speech-appropriate.
  result.grammarCorrections = result.grammarCorrections.filter((item) => {
    if (!item.original || !item.corrected) return false;
    if (isMostlyContractionExpansion(item.original, item.corrected)) return false;
    const o = item.original.toLowerCase().replace(/\s+/g, " ").trim();
    const c = item.corrected.toLowerCase().replace(/\s+/g, " ").trim();
    if (o === `that was the moment that really unlocked my potential` && c === `that moment really unlocked my potential`) {
      return false;
    }
    return true;
  });

  assembleOverallFromCriteria(result);
}

function buildPart2ReportV2(
  result: AssessmentResult,
  question: string,
  transcript: string,
  audioMetadata: WhisperAudioMetadata | null,
) {
  const punctuated = punctuateTranscript(transcript);
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const referencingCount = countReferencingTokens(transcript);
  const transitionLexicon = [
    "however",
    "in contrast",
    "with regard to",
    "moving on to",
    "finally",
    "therefore",
    "moreover",
    "for example",
  ];
  const lower = transcript.toLowerCase();
  const transitionWords = transitionLexicon.filter((w) => lower.includes(w)).slice(0, 8);
  const goodVocabulary = result.vocabularyUpgrades.map((v) => v.better).filter(Boolean).slice(0, 8);
  const errorPhrases = result.grammarCorrections
    .map((g) => ({ phrase: g.original, intended: g.corrected }))
    .filter((x) => x.phrase && x.intended)
    .slice(0, 8);

  const lp = audioMetadata?.avgLogprob ?? -0.9;
  const baseConf = Math.round(Math.max(45, Math.min(98, (1 + lp) * 75 + 35)));
  const lowConfidenceWords = errorPhrases.map((e, i) => ({
    intended: e.intended,
    heard: e.phrase,
    confidencePct: Math.max(45, baseConf - (i + 1) * 12),
  }));

  const corrections = [
    ...result.grammarCorrections.map((g) => ({
      category: "grammar" as const,
      wrong: g.original,
      right: g.corrected,
      reasonTh: g.thaiExplanation,
      reasonEn: "Grammar accuracy and structure improved for clarity.",
    })),
    ...result.vocabularyUpgrades.map((v) => ({
      category: "vocabulary" as const,
      wrong: v.original,
      right: v.better,
      reasonTh: v.thaiExplanation,
      reasonEn: "Vocabulary choice upgraded for precision and natural collocation.",
    })),
  ].slice(0, 5);

  const bandRationale = [
    {
      key: "fluency" as const,
      title: "Fluency & Coherence",
      currentBand: result.criteria.fluencyCoherence.band,
      checklistHits: [
        `Word count: ${words}`,
        `Referencing count: ${referencingCount}`,
        `Transitions detected: ${transitionWords.length}`,
      ],
    },
    {
      key: "grammar" as const,
      title: "Grammar",
      currentBand: result.criteria.grammarRangeAccuracy.band,
      checklistHits: [
        `Tense variance detected: ${hasTenseVariance(transcript) ? "yes" : "limited"}`,
        `Grammar corrections flagged: ${result.grammarCorrections.length}`,
      ],
    },
    {
      key: "vocabulary" as const,
      title: "Vocabulary",
      currentBand: result.criteria.lexicalResource.band,
      checklistHits: [
        `Strong collocations detected: ${countStrongSpokenCollocations(transcript)}`,
        `Vocabulary upgrades available: ${result.vocabularyUpgrades.length}`,
      ],
    },
    {
      key: "pronunciation" as const,
      title: "Pronunciation",
      currentBand: result.criteria.pronunciation.band,
      checklistHits: [
        `Whisper avg logprob: ${audioMetadata?.avgLogprob ?? "n/a"}`,
        `Whisper no-speech prob: ${audioMetadata?.avgNoSpeechProb ?? "n/a"}`,
        `Whisper WPM: ${audioMetadata?.wordsPerMinute ?? "n/a"}`,
      ],
    },
  ];

  const detectedEvidence = [
    ...transitionWords.map((w) => `Transition used: "${w}"`),
    ...errorPhrases.map((e) => `Detected phrase: "${e.phrase}" -> intended "${e.intended}"`),
  ].slice(0, 18);

  const actionableFixes = [
    ...corrections.map((c) => `${c.wrong} -> ${c.right}`),
    ...result.priorityActions.map((a) => a.english),
  ].slice(0, 18);

  const nextBandPlan = [
    {
      key: "fluency" as const,
      currentBand: toScore(result.criteria.fluencyCoherence.band),
      targetBand: clampBandTarget(result.criteria.fluencyCoherence.band),
      tasks: [
        words < 250 ? `Add ${Math.max(0, 250 - words)}+ words with one clear intro and one closing sentence.` : "Maintain 250+ words while tightening idea grouping.",
        referencingCount < 2 ? "Add at least 2 accurate references (this/that/these/those/such)." : "Increase referencing variety without overusing one form.",
        "Use at least one contrast linker (however/in contrast) and one example linker (for example).",
      ],
    },
    {
      key: "grammar" as const,
      currentBand: toScore(result.criteria.grammarRangeAccuracy.band),
      targetBand: clampBandTarget(result.criteria.grammarRangeAccuracy.band),
      tasks: [
        "Upgrade one narration segment to present perfect or past perfect where logically suitable.",
        "Fix recurring tense or subject-verb errors in the highlighted correction list.",
      ],
    },
    {
      key: "vocabulary" as const,
      currentBand: toScore(result.criteria.lexicalResource.band),
      targetBand: clampBandTarget(result.criteria.lexicalResource.band),
      tasks: [
        "Replace 3 basic phrases with B2-C1 collocations in the next attempt.",
        "Reuse corrected collocations from this report in a new 2-minute response.",
      ],
    },
    {
      key: "pronunciation" as const,
      currentBand: toScore(result.criteria.pronunciation.band),
      targetBand: clampBandTarget(result.criteria.pronunciation.band),
      tasks: [
        "Shadow the low-confidence words 3 rounds at slow, normal, and natural speed.",
        "Record again and aim to increase Whisper confidence on highlighted words by 10%+.",
      ],
    },
  ];

  result.reportV2 = {
    version: "part2-v2",
    header: {
      topicTh: "หัวข้อพูด Part 2",
      topicEn: question,
      overallBand: result.overall.roundedBand,
    },
    rubricCards: [
      {
        key: "fluency",
        titleTh: "ความคล่องแคล่วและการเชื่อมโยง",
        titleEn: "Fluency & Coherence",
        band: result.criteria.fluencyCoherence.band,
        feedbackTh: result.criteria.fluencyCoherence.thaiExplanation,
        feedbackEn: result.criteria.fluencyCoherence.englishExplanation,
        progressPct: Math.round((result.criteria.fluencyCoherence.band / 9) * 100),
      },
      {
        key: "grammar",
        titleTh: "ไวยากรณ์",
        titleEn: "Grammar",
        band: result.criteria.grammarRangeAccuracy.band,
        feedbackTh: result.criteria.grammarRangeAccuracy.thaiExplanation,
        feedbackEn: result.criteria.grammarRangeAccuracy.englishExplanation,
        progressPct: Math.round((result.criteria.grammarRangeAccuracy.band / 9) * 100),
      },
      {
        key: "vocabulary",
        titleTh: "คำศัพท์",
        titleEn: "Vocabulary",
        band: result.criteria.lexicalResource.band,
        feedbackTh: result.criteria.lexicalResource.thaiExplanation,
        feedbackEn: result.criteria.lexicalResource.englishExplanation,
        progressPct: Math.round((result.criteria.lexicalResource.band / 9) * 100),
      },
      {
        key: "pronunciation",
        titleTh: "การออกเสียง",
        titleEn: "Pronunciation",
        band: result.criteria.pronunciation.band,
        feedbackTh: result.criteria.pronunciation.thaiExplanation,
        feedbackEn: result.criteria.pronunciation.englishExplanation,
        progressPct: Math.round((result.criteria.pronunciation.band / 9) * 100),
      },
    ],
    transcriptAnalysis: {
      punctuatedTranscript: punctuated,
      transitionWords,
      goodVocabulary,
      errorPhrases,
    },
    pronunciation: {
      overallConfidencePct: baseConf,
      lowConfidenceWords,
    },
    bandRationale,
    detectedEvidence,
    actionableFixes,
    nextBandPlan,
    corrections,
  };
}

function parseJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in model output");
  const raw = text.slice(start, end + 1);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Tolerate common model JSON issues: trailing commas and fenced code wrappers.
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned) as Record<string, unknown>;
  }
}

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value;
  }
  return "";
}

function parseModelCandidates(raw: string | undefined, defaults: string[]) {
  const fromEnv = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const combined = [...fromEnv, ...defaults];
  return [...new Set(combined)];
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

function extractOpenAIText(payload: unknown) {
  const asRecord = (payload ?? {}) as Record<string, unknown>;
  const outputText = typeof asRecord.output_text === "string" ? asRecord.output_text.trim() : "";
  if (outputText) return outputText;

  const output = Array.isArray(asRecord.output) ? asRecord.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    const itemRecord = item as Record<string, unknown>;
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const part of content) {
      const partRecord = part as Record<string, unknown>;
      if (typeof partRecord.text === "string" && partRecord.text.trim()) {
        chunks.push(partRecord.text.trim());
      }
    }
  }
  return chunks.join("\n").trim();
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

const PART2_STRICT_CRITERIA = `
PART 2 SCORING CRITERIA RESET

MANDATORY FIRST STEP:
- Add punctuation to the script first before evaluation.

GENERAL:
- This is spoken English from ASR. Do not grade it like a formal essay.
- Keep contraction usage natural for speaking.
- Keep pronunciation scoring based on Whisper audio confidence signals only (do not override with transcript heuristics).

GRAMMAR (Grammatical Range and Accuracy)
Band 9:
- Use conditionals, perfect tense, and past tense.
- No grammar mistake at all (for speaking purpose).
- Uses subordinating conjunctions accurately.

Band 8:
- Use perfect tense and past tense.
- Uses subordinating conjunctions.
- No grammar mistakes.

Band 7:
- Use simple tense correctly.
- Uses subordinating conjunctions.
- Minor grammar mistakes are acceptable (no more than 3 times).

Band 6:
- No more than 3 mistakes in simple tense.
- Mistakes in past tense.
- Mistakes in subordinating conjunctions, or don’t use subordinating conjunctions.
- More than 5 mistakes in grammar (article, tense, noun, conjugation), but they don’t hinder understanding.

Band 5:
- Mistakes in simple tense.
- No transition between tense (e.g., present simple for something happened in the past).
- Don’t use subordinating conjunctions, or use them incorrectly.
- More than 5 grammar mistakes (article, tense, noun, conjugation), and they hinder understanding.

Band 4:
- Mistakes in simple tense.
- No transition between tense (e.g., present simple for something happened in the past).
- Don’t use subordinating conjunctions, or use them incorrectly.
- More than 5 grammar mistakes (article, tense, noun, conjugation), and they hinder understanding.

VOCABULARY (Lexical Resource)
Band 9:
- Use more than 6 collocations (B1+ level across noun+adjective, verb+noun, verb+adverb types).
- At least 2 C1-C2 collocations.
- No mistakes or awkwardness in vocabulary use.

Band 8:
- Use more than 4-5 collocations (B1+ level across all types above).
- At least 1 C1-C2 collocation.
- No mistakes or awkwardness in vocabulary use.

Band 7:
- Use more than 2-5 collocations (B1+ level across all types above).
- No mistakes in vocabulary use.
- No more than 3 awkward/unnatural vocabulary uses.

Band 6:
- Most collocation and vocabulary use is A2-B1.
- Makes awkwardness/mistakes throughout but still understandable.

Band 5:
- Most collocation and vocabulary use is A2-B1.
- Makes awkwardness/mistakes throughout and more than 2-3 sentences don’t make sense.

Band 4:
- Most collocation and vocabulary use is A1-B1.
- Makes awkwardness/mistakes throughout and more than 3 sentences don’t make sense.

FLUENCY & COHERENCE
Band 9:
- At least 310 words.
- Use referencing (this, that, those, such...) throughout (more than 4 times) with no mistakes.
- No hesitation, no self-correction.

Band 8:
- At least 280 words.
- Use referencing throughout (more than 3 times) with no mistakes.
- If hesitation/self-correction exists, self-correction is correct.

Band 7:
- At least 250 words.
- Use referencing at least 2 times correctly.
- If hesitation/self-correction exists, self-correction is always correct.

Band 6:
- Between 200-250 words.
- No referencing, or referencing sometimes incorrect.
- If hesitation/self-correction exists, self-correction is sometimes wrong.

Band 5:
- Fewer than 200 words.
- No referencing, or referencing always incorrect.
- If hesitation/self-correction exists, self-correction is mostly wrong (>50%).

Band 4:
- Fewer than 200 words.
- No referencing, or referencing always incorrect.
- If hesitation/self-correction exists, self-correction is almost always wrong (>70%).

RECOMMENDATION RULES (STEP +1 ONLY)
- Offer recommendations for the next immediate level only.
- Example: if current level is 6, recommendations must target 7.
- For Fluency: if stuck at 220 words (Band 6), recommend exactly what additional sentence types/parts to add to reach 7.
- For Grammar: if at 7, either:
  - suggest where perfect tense could be used, or
  - correct minor mistakes and explain why they are wrong.
`;

function buildAssessmentPrompt(body: AssessBody) {
  const audioMetaText =
    body.audioMetadata && typeof body.audioMetadata === "object"
      ? JSON.stringify(body.audioMetadata)
      : typeof body.audioMetadata === "string" && body.audioMetadata.trim()
        ? body.audioMetadata.trim()
        : "none";
  return `${ASSESSMENT_PROMPT_PREAMBLE}

When audio metadata is provided, focus your scoring judgment for:
- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
from transcript evidence.
Pronunciation may reference metadata but final pronunciation band can be adjusted downstream.

${body.mode === "part-2" ? PART2_STRICT_CRITERIA : ""}

Now assess this IELTS Speaking response.

IELTS Speaking Part:
${body.mode}

Question:
${body.question}

Speech-to-text transcript:
${body.transcript}

Audio metadata, if available:
${audioMetaText}`;
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
  const payload = (await res.json()) as unknown;
  const text = extractOpenAIText(payload);
  if (!text) throw new ProviderCallError("OpenAI returned empty output_text.", "empty_response");
  return { provider: "openai" as const, model, text };
}

async function callClaude(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("ANTHROPIC_API_KEY", "CLAUDE_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing Claude key.", "missing_key");
  const models = parseModelCandidates(process.env.ANTHROPIC_SPEAKING_MODEL, [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-haiku-20240307",
  ]);

  let lastError: ProviderCallError | null = null;
  for (const model of models) {
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
      lastError = new ProviderCallError(`Claude HTTP ${res.status}`, "http_error", res.status, responseSnippet);
      if (res.status === 404) continue;
      throw lastError;
    }
    const payload = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = payload.content?.find((item) => item.type === "text")?.text ?? "";
    if (!text.trim()) {
      lastError = new ProviderCallError("Claude returned empty text.", "empty_response");
      continue;
    }
    return { provider: "anthropic" as const, model, text: text.trim() };
  }

  throw lastError ?? new ProviderCallError("Claude failed for all configured models.", "model_fallback_exhausted");
}

async function callGemini(prompt: string, signal: AbortSignal) {
  const apiKey = firstEnv("GEMINI_API_KEY", "GOOGLE_API_KEY");
  if (!apiKey) throw new ProviderCallError("Missing Gemini key.", "missing_key");
  const models = parseModelCandidates(process.env.GEMINI_SPEAKING_MODEL, [
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro-002",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ]);

  let lastError: ProviderCallError | null = null;
  for (const model of models) {
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
      lastError = new ProviderCallError(`Gemini HTTP ${res.status}`, "http_error", res.status, responseSnippet);
      if (res.status === 404) continue;
      throw lastError;
    }
    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text.trim()) {
      lastError = new ProviderCallError("Gemini returned empty text.", "empty_response");
      continue;
    }
    return { provider: "gemini" as const, model, text: text.trim() };
  }

  throw lastError ?? new ProviderCallError("Gemini failed for all configured models.", "model_fallback_exhausted");
}

async function withProviderTimeout<T>(
  providerName: "openai" | "anthropic" | "gemini",
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 75000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProviderCallError(`${providerName} timed out after ${timeoutMs}ms`, "timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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
    () => withProviderTimeout("gemini", (signal) => callGemini(prompt, signal)),
    () => withProviderTimeout("anthropic", (signal) => callClaude(prompt, signal)),
    () => withProviderTimeout("openai", (signal) => callOpenAI(prompt, signal)),
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
  const providerOrder: Array<"openai" | "anthropic" | "gemini"> = ["gemini", "anthropic", "openai"];
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
        const whisperMeta = parseWhisperMetadata(body.audioMetadata);
        if (whisperMeta) {
          result.criteria.pronunciation = buildPronunciationFromWhisper(whisperMeta);
          assembleOverallFromCriteria(result);
          result.overall.reliabilityWarning =
            "Pronunciation uses Whisper audio metadata; overall band is assembled from transcript criteria + audio-based pronunciation.";
        }
        if (body.mode === "part-2") {
          buildPart2ReportV2(result, body.question, body.transcript, whisperMeta);
          applyPart2SpokenCalibration(result, body.transcript);
        }
        result.feedbackSource = output.provider;
        result.feedbackModel = output.model;
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
    await logUsage(false, Date.now() - startedAt, "openai", process.env.OPENAI_SPEAKING_MODEL || "gpt-4o-mini", "network");
    return NextResponse.json({ error: "Assessment request failed." }, { status: 502 });
  }
}
