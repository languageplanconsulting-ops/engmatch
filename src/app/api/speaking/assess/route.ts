import { NextResponse } from "next/server";

type AssessBody = {
  question: string;
  transcript: string;
  mode: "part-1" | "part-3";
};

export type AnnotatedPhrase = {
  phrase: string;
  category: "grammar" | "vocabulary" | "pronunciation" | "coherence";
  issue: string;
  correction: string;
};

export type CriterionDetail = {
  score: number;
  scoreTh: string;
  scoreEn: string;
  whyBullets: string[];      // up to 5 — why they got this score
  improveBullets: string[];  // up to 10 — exact phrase → how to improve
};

export type AssessmentResult = {
  /** Punctuated version of the raw transcript (no grammar fixes) */
  punctuatedTranscript: string;
  fluency: CriterionDetail;
  vocabulary: CriterionDetail;
  grammar: CriterionDetail;
  pronunciation: CriterionDetail;
  overall: number;               // rounded to nearest 0.5
  overallTh: string;
  overallEn: string;
  /** Annotated phrases for highlight overlay (colour-coded) */
  annotations: AnnotatedPhrase[];
  /** Improved script — spoken-language focus, grammar corrections only */
  improvedScript: string;
};

const CRITERIA_RUBRIC = `
IELTS Speaking Assessment Criteria (Official Band Descriptors)

1. FLUENCY AND COHERENCE
Band 9: Speaks fluently with only rare hesitation. Ideas are logically organized. Uses cohesive devices naturally.
Band 8: Mostly fluent, occasional hesitation for content (not language). Well-organized ideas. Uses a wide range of linking devices.
Band 7: Speaks at length without noticeable effort. Some hesitation or repetition. Uses linking words but may overuse or misuse slightly.
Band 6: Willing to speak at length. Noticeable hesitation and repetition. Uses basic cohesive devices (and, but, because).
Band 5: Usually maintains flow but with frequent pauses. Overuses simple connectors. Ideas may lack clear progression.
Band 4: Frequent hesitation. Limited ability to link ideas. Speech is sometimes difficult to follow.

2. LEXICAL RESOURCE
Band 9: Uses vocabulary with full flexibility and precision. Natural and accurate idiomatic usage.
Band 8: Wide vocabulary range. Occasional minor inaccuracies. Good use of paraphrasing.
Band 7: Sufficient vocabulary for flexibility. Some errors in word choice or collocation. Can paraphrase effectively.
Band 6: Adequate vocabulary for familiar topics. Limited flexibility. Attempts paraphrasing but with errors.
Band 5: Limited vocabulary. Frequent repetition. Errors in word choice may cause difficulty.
Band 4: Very basic vocabulary. Frequent misuse. Cannot paraphrase effectively.

3. GRAMMATICAL RANGE AND ACCURACY
Band 9: Full range of structures used naturally. Almost no errors.
Band 8: Wide range of structures. Occasional minor errors.
Band 7: Uses a mix of simple and complex structures. Some grammatical errors but meaning is clear.
Band 6: Mix of simple and some complex sentences. Frequent errors, but communication is maintained.
Band 5: Mostly simple sentences. Frequent grammatical errors. Limited control of structure.
Band 4: Very limited structures. Errors often cause misunderstanding.

4. PRONUNCIATION
Band 9: Easy to understand. Uses stress and intonation naturally.
Band 8: Clear and natural pronunciation. Minor lapses.
Band 7: Generally clear. Some mispronunciations. Good control of rhythm and intonation.
Band 6: Understandable overall. Noticeable accent and errors. Limited control of stress/intonation.
Band 5: Difficult to understand at times. Frequent pronunciation errors.
Band 4: Hard to understand. Frequent breakdown in communication.
`;

/**
 * POST /api/speaking/assess
 * Step 1: punctuate the raw transcript (no grammar fixes, just add punctuation).
 * Step 2: assess using the official IELTS rubric with Gemini 2.5 Flash.
 * Returns full bilingual (EN + TH) report with annotations for colour-coded highlights.
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  let body: AssessBody;
  try {
    body = (await req.json()) as AssessBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.transcript?.trim()) {
    return NextResponse.json({ error: "transcript field is required." }, { status: 400 });
  }

  const partLabel =
    body.mode === "part-1"
      ? "Part 1 (personal questions, ~1 min answers)"
      : "Part 3 (abstract discussion, extended answers)";
  const model = "gemini-2.5-flash";

  const prompt = `You are an expert IELTS speaking examiner and a bilingual English–Thai language teacher.

${CRITERIA_RUBRIC}

TASK
====
Assess the following student response and return ONLY a valid JSON object — no markdown, no prose outside the JSON.

IELTS Part: ${partLabel}
Question: "${body.question}"
Raw student transcript (no punctuation): "${body.transcript}"

STEP 1 — PUNCTUATION
Add correct punctuation to the raw transcript. Do NOT fix grammar or change word choice. Only add commas, full stops, question marks, and capitalise sentence starts. Store the result as "punctuatedTranscript".

STEP 2 — ASSESSMENT
Using the punctuated transcript, assess each criterion against the band descriptors above.

STEP 3 — ANNOTATIONS
Identify up to 8 specific phrases from the punctuated transcript that have issues. Classify each as:
- "grammar"       → highlight red
- "vocabulary"    → highlight light blue
- "pronunciation" → highlight light yellow (infer from word choice / common L1 Thai errors)
- "coherence"     → highlight light green

STEP 4 — IMPROVED SCRIPT
Write an improved version of the answer. Rules:
- Focus on grammar corrections only — this is SPOKEN language, not writing
- Keep vocabulary mostly the same; no dramatic vocabulary upgrades
- Keep it natural and spoken in register
- Write in English only

OUTPUT FORMAT (return exactly this JSON):
{
  "punctuatedTranscript": "<string>",
  "fluency": {
    "score": <4.0–9.0 in 0.5 steps>,
    "scoreTh": "<Thai explanation of why they got this score, 1 sentence>",
    "scoreEn": "<English explanation of why they got this score, 1 sentence>",
    "whyBullets": ["<up to 5 bullet strings in English explaining the score>"],
    "improveBullets": ["<up to 10 strings: 'EXACT PHRASE USED → how to improve to get higher score'>"]
  },
  "vocabulary": {
    "score": <number>,
    "scoreTh": "<string>",
    "scoreEn": "<string>",
    "whyBullets": ["<string>"],
    "improveBullets": ["<string>"]
  },
  "grammar": {
    "score": <number>,
    "scoreTh": "<string>",
    "scoreEn": "<string>",
    "whyBullets": ["<string>"],
    "improveBullets": ["<string>"]
  },
  "pronunciation": {
    "score": <number>,
    "scoreTh": "<string>",
    "scoreEn": "<string>",
    "whyBullets": ["<string>"],
    "improveBullets": ["<string>"]
  },
  "overall": <average of 4 scores rounded to nearest 0.5>,
  "overallTh": "<1–2 Thai sentences overall feedback in a warm coach tone>",
  "overallEn": "<1–2 English sentences overall feedback in a warm coach tone>",
  "annotations": [
    {
      "phrase": "<exact phrase from punctuatedTranscript>",
      "category": "grammar|vocabulary|pronunciation|coherence",
      "issue": "<short English description of the problem>",
      "correction": "<short English correction or suggestion>"
    }
  ],
  "improvedScript": "<full improved spoken answer in English>"
}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 4096 },
      }),
    },
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return NextResponse.json(
      { error: `Gemini API error ${geminiRes.status}: ${errText}` },
      { status: 502 },
    );
  }

  const geminiJson = (await geminiRes.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  let result: AssessmentResult;
  try {
    result = JSON.parse(cleaned) as AssessmentResult;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse Gemini response.", raw: rawText.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}
