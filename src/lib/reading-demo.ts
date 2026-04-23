import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "fill-in-blank"
  | "multiple-choice"
  | "matching-heading"
  | "matching-information";

/** Character-index range within a passage's text string (0-based). */
export type HintRange = {
  start: number;
  end: number;
};

export type ReadingParaphraseLink = {
  question: string;
  passage: string;
};

type BaseQuestion = {
  id: string;
  type: QuestionType;
  number: number;
  /** Shown in the report when the student answers incorrectly. */
  explanation: string;
  /** Passage substring to highlight when the student clicks Hint. */
  hint: HintRange;
  /** Original source type from imported answer-key JSON, if different. */
  sourceType?: string;
  thaiExplanation?: string;
  evidence?: string;
  paraphraseLinks?: ReadingParaphraseLink[];
};

export type FillInBlankQuestion = BaseQuestion & {
  type: "fill-in-blank";
  /** Sentence shown to the student — use ___ for the gap. */
  text: string;
  correctAnswer: string;
};

export type MultipleChoiceQuestion = BaseQuestion & {
  type: "multiple-choice";
  text: string;
  /** Each option begins with its letter, e.g. "A. Lower food prices" */
  options: string[];
  /** Single letter, e.g. "B" */
  correctAnswer: string;
};

export type MatchingQuestion = BaseQuestion & {
  type: "matching-heading" | "matching-information";
  /** e.g. "Paragraph A" or "Which paragraph mentions...?" */
  text: string;
  /** List of headings or paragraph labels to match from. */
  options: string[];
  correctAnswer: string;
};

export type ReadingQuestion =
  | FillInBlankQuestion
  | MultipleChoiceQuestion
  | MatchingQuestion;

export type ReadingPassage = {
  id: string;
  title: string;
  text: string;
  questions: ReadingQuestion[];
};

export type ReadingTest = {
  id: string;
  title: string;
  /** "passage" = single passage; "full" = three passages combined */
  type: "passage" | "full";
  passageNumber?: 1 | 2 | 3;
  passages: ReadingPassage[];
  /** Time in minutes */
  timeLimit: number;
  level: string;
};

export type StudentAnswer = {
  questionId: string;
  value: string;
};

export type ReadingAttempt = {
  testId: string;
  answers: StudentAnswer[];
  submittedAt: string;
};

export const ANSWER_KEY_QUESTION_TYPES = [
  "TRUE_FALSE_NOT_GIVEN",
  "SHORT_ANSWER",
  "MATCHING_INFORMATION",
  "MATCHING_PEOPLE",
  "SUMMARY_COMPLETION",
  "MULTIPLE_CHOICE",
  "SENTENCE_COMPLETION",
  "YES_NO_NOT_GIVEN",
] as const;

export type ReadingAnswerKeyQuestionType =
  (typeof ANSWER_KEY_QUESTION_TYPES)[number];

export type ReadingAnswerKeyQuestionUpload = {
  number: number;
  type: ReadingAnswerKeyQuestionType;
  answer: string;
  thai_explanation: string;
  paraphrase_links: ReadingParaphraseLink[];
  evidence: string;
};

export type ReadingAnswerKeyPassageUpload = {
  passage_id: number;
  title: string;
  questions: ReadingAnswerKeyQuestionUpload[];
};

export type ReadingAnswerKeyUpload = {
  source_file?: string;
  exam?: string;
  notes?: string;
  passages: ReadingAnswerKeyPassageUpload[];
};

export type ReadingPassageDraft = {
  passage_id: number;
  title: string;
  text: string;
};

export type ReadingImportedTestPackage = {
  id: string;
  exam: string;
  notes: string;
  sourceFile: string;
  importedAt: string;
  test: ReadingTest;
  /** Optional admin-defined slot placement for imported passages. */
  passageSlots?: Record<string, number>;
  missingPassageIds: number[];
  unsupportedQuestionNumbers: number[];
};

export const READING_IMPORTED_TESTS_STORAGE_KEY =
  "engmatch-reading-imported-tests-v2";

// ─── Passage text constants ────────────────────────────────────────────────────
// Character positions are noted beside key phrases so JSON authors can write
// accurate hint ranges. Positions are 0-based indices into the text string.

// Passage 1 — Urban Farming
// Key positions:
//   0   : "Urban farming has grown…"
//   101 : "grassroots movement" starts   (Q1 fill-in-blank)
//   411 : "reduce their reliance"        (Q2 MC answer region)
//   635 : para 3 starts "Critics note…" (Q3 matching-heading)
const URBAN_FARMING_TEXT = `Urban farming has grown rapidly in cities around the world over the past two decades. What began as a grassroots movement of small community gardens has evolved into a sophisticated industry that employs cutting-edge technology, including vertical farms and hydroponic systems, to produce food in dense urban environments.

The advantages of urban farming are considerable. Cities that embrace urban agriculture can reduce their reliance on long-distance food transportation, lowering carbon emissions while ensuring fresher produce for residents. Urban farms also serve as community hubs that bring together people from diverse backgrounds.

Critics note several persistent challenges. Urban land is scarce and expensive. Water usage in hydroponic systems is substantial. The economic viability of many urban farms remains uncertain, since most currently rely on public grants rather than commercial revenue.`;

// Passage 2 — Antarctic Research
// Key positions:
//   0   : "Antarctica presents…"
//   88  : "ice sheet" starts             (Q4 fill-in-blank)
//   325 : "ozone layer" appears          (Q5 MC answer)
//   560 : para 3 "Recent discoveries…"  (Q6 matching-information)
const ANTARCTIC_TEXT = `Antarctica presents scientists with one of the most challenging and rewarding research environments on Earth. The continent's vast ice sheet, which contains approximately 70 percent of the world's fresh water, serves as an irreplaceable archive of climate history stretching back 800,000 years.

Permanent and seasonal research stations operated by more than 30 nations allow scientists to monitor changes in the ice cap, study unique wildlife, and measure shifts in the ozone layer above the southern pole. The collaborative nature of Antarctic research is enshrined in the Antarctic Treaty of 1959, which designates the continent a zone of scientific cooperation.

Recent discoveries have elevated the importance of Antarctic research. Subglacial lakes, hidden beneath kilometres of ice, may harbour microbial life forms that have evolved in complete isolation for millions of years. If confirmed, these findings would have profound implications for our understanding of the conditions required for life to exist.`;

// Passage 3 — The Science of Sleep
// Key positions:
//   0   : "Sleep is far more…"
//   94  : "circadian rhythm" starts      (Q7 fill-in-blank)
//   330 : "hippocampus" region           (Q8 MC memory answer)
//   590 : para 3 "Chronic sleep loss…"  (Q9 matching-heading)
const SLEEP_SCIENCE_TEXT = `Sleep is far more than a passive state of rest. Governed by an internal biological clock known as the circadian rhythm, the human body cycles through distinct stages of sleep, each serving a specific physiological purpose. Without adequate sleep, nearly every system in the body is affected.

During the rapid eye movement, or REM, stage, the brain consolidates memories by replaying and reorganising experiences from the day. The hippocampus, a region critical to memory formation, transfers information to the prefrontal cortex for long-term storage during this stage. Disrupting REM sleep even for a single night measurably impairs learning and recall.

Chronic sleep loss is now recognised as a significant public health concern. Epidemiological studies link persistent sleep deprivation to elevated risks of cardiovascular disease, type 2 diabetes, obesity, and mental health disorders. Sleep researchers argue that societal and workplace norms need to change to protect this biological necessity.`;

// ─── Demo reading tests ────────────────────────────────────────────────────────

export const readingTests: ReadingTest[] = [
  // ── Passage 1 ──────────────────────────────────────────────────────────────
  {
    id: "rs-passage-1",
    title: "Passage 1 — Urban Farming Trends",
    type: "passage",
    passageNumber: 1,
    timeLimit: 20,
    level: "Band 6.5–7.0",
    passages: [
      {
        id: "p1",
        title: "Urban Farming Trends",
        text: URBAN_FARMING_TEXT,
        questions: [
          {
            id: "p1-q1",
            type: "fill-in-blank",
            number: 1,
            text: "Urban farming began as a ___ of small community gardens.",
            correctAnswer: "grassroots movement",
            explanation:
              "The passage states in the first paragraph: 'What began as a grassroots movement of small community gardens has evolved into a sophisticated industry.'",
            hint: { start: 95, end: 161 },
          } satisfies FillInBlankQuestion,
          {
            id: "p1-q2",
            type: "multiple-choice",
            number: 2,
            text: "According to the passage, which of the following is an advantage of urban farming?",
            options: [
              "A. Lower food prices for consumers",
              "B. Reduced reliance on long-distance food transportation",
              "C. Decreased overall water consumption",
              "D. Increased suburban land values",
            ],
            correctAnswer: "B",
            explanation:
              "Paragraph 2 explicitly states that cities can 'reduce their reliance on long-distance food transportation, lowering carbon emissions while ensuring fresher produce for residents.'",
            hint: { start: 370, end: 500 },
          } satisfies MultipleChoiceQuestion,
          {
            id: "p1-q3",
            type: "matching-heading",
            number: 3,
            text: "Choose the most suitable heading for Paragraph C.",
            options: [
              "i. The rise of technology-driven food production",
              "ii. Key benefits of growing food in cities",
              "iii. Obstacles facing the urban farming industry",
              "iv. The history of community gardening",
            ],
            correctAnswer: "iii. Obstacles facing the urban farming industry",
            explanation:
              "Paragraph C (the third paragraph) is entirely about challenges: scarce land, high water usage, and uncertain economic viability. Heading iii best captures this.",
            hint: { start: 635, end: 850 },
          } satisfies MatchingQuestion,
        ],
      },
    ],
  },

  // ── Passage 2 ──────────────────────────────────────────────────────────────
  {
    id: "rs-passage-2",
    title: "Passage 2 — Antarctic Research",
    type: "passage",
    passageNumber: 2,
    timeLimit: 20,
    level: "Band 7.0–7.5",
    passages: [
      {
        id: "p2",
        title: "Antarctic Research Notes",
        text: ANTARCTIC_TEXT,
        questions: [
          {
            id: "p2-q1",
            type: "fill-in-blank",
            number: 1,
            text: "Antarctica's ___ contains approximately 70 percent of the world's fresh water.",
            correctAnswer: "vast ice sheet",
            explanation:
              "The first paragraph reads: 'The continent's vast ice sheet, which contains approximately 70 percent of the world's fresh water…'",
            hint: { start: 80, end: 165 },
          } satisfies FillInBlankQuestion,
          {
            id: "p2-q2",
            type: "multiple-choice",
            number: 2,
            text: "What do scientists measure from research stations in Antarctica, according to Paragraph 2?",
            options: [
              "A. Ocean temperature at the equator",
              "B. Rainfall patterns in the southern hemisphere",
              "C. Changes in the ozone layer above the southern pole",
              "D. Volcanic activity beneath the ice cap",
            ],
            correctAnswer: "C",
            explanation:
              "Paragraph 2 states that scientists at research stations 'measure shifts in the ozone layer above the southern pole.'",
            hint: { start: 320, end: 420 },
          } satisfies MultipleChoiceQuestion,
          {
            id: "p2-q3",
            type: "matching-information",
            number: 3,
            text: "Which paragraph mentions the possibility of life existing in extreme isolation?",
            options: ["Paragraph A", "Paragraph B", "Paragraph C"],
            correctAnswer: "Paragraph C",
            explanation:
              "Paragraph C (the third paragraph) discusses subglacial lakes that 'may harbour microbial life forms that have evolved in complete isolation for millions of years.'",
            hint: { start: 560, end: 750 },
          } satisfies MatchingQuestion,
        ],
      },
    ],
  },

  // ── Passage 3 ──────────────────────────────────────────────────────────────
  {
    id: "rs-passage-3",
    title: "Passage 3 — The Science of Sleep",
    type: "passage",
    passageNumber: 3,
    timeLimit: 20,
    level: "Band 7.5–8.0",
    passages: [
      {
        id: "p3",
        title: "The Science of Sleep",
        text: SLEEP_SCIENCE_TEXT,
        questions: [
          {
            id: "p3-q1",
            type: "fill-in-blank",
            number: 1,
            text: "The human body's sleep cycle is governed by a biological clock called the ___.",
            correctAnswer: "circadian rhythm",
            explanation:
              "Paragraph 1 states: 'Governed by an internal biological clock known as the circadian rhythm, the human body cycles through distinct stages of sleep.'",
            hint: { start: 85, end: 115 },
          } satisfies FillInBlankQuestion,
          {
            id: "p3-q2",
            type: "multiple-choice",
            number: 2,
            text: "According to the passage, what is the role of the hippocampus during REM sleep?",
            options: [
              "A. It regulates body temperature during rest",
              "B. It transfers information to the prefrontal cortex for long-term storage",
              "C. It generates the rapid eye movement signals",
              "D. It suppresses unwanted memories permanently",
            ],
            correctAnswer: "B",
            explanation:
              "Paragraph 2 explains: 'The hippocampus, a region critical to memory formation, transfers information to the prefrontal cortex for long-term storage during this stage.'",
            hint: { start: 430, end: 560 },
          } satisfies MultipleChoiceQuestion,
          {
            id: "p3-q3",
            type: "matching-heading",
            number: 3,
            text: "Choose the most suitable heading for Paragraph C.",
            options: [
              "i. How the brain processes memories overnight",
              "ii. The biological purpose of the sleep cycle",
              "iii. Sleep deprivation as a public health issue",
              "iv. The link between REM sleep and creativity",
            ],
            correctAnswer: "iii. Sleep deprivation as a public health issue",
            explanation:
              "Paragraph C focuses on 'chronic sleep loss' being 'a significant public health concern' linked to multiple diseases, matching heading iii.",
            hint: { start: 590, end: 820 },
          } satisfies MatchingQuestion,
        ],
      },
    ],
  },

  // ── Full Test ───────────────────────────────────────────────────────────────
  {
    id: "rs-full-test-1",
    title: "Full Academic Reading Test 1",
    type: "full",
    timeLimit: 60,
    level: "Band 6.5–8.0",
    passages: [
      {
        id: "p1",
        title: "Urban Farming Trends",
        text: URBAN_FARMING_TEXT,
        questions: [
          {
            id: "ft-p1-q1",
            type: "fill-in-blank",
            number: 1,
            text: "Urban farming began as a ___ of small community gardens.",
            correctAnswer: "grassroots movement",
            explanation:
              "The passage states: 'What began as a grassroots movement of small community gardens has evolved into a sophisticated industry.'",
            hint: { start: 95, end: 161 },
          } satisfies FillInBlankQuestion,
          {
            id: "ft-p1-q2",
            type: "multiple-choice",
            number: 2,
            text: "Which of the following is an advantage of urban farming mentioned in the passage?",
            options: [
              "A. Lower food prices for consumers",
              "B. Reduced reliance on long-distance food transportation",
              "C. Decreased overall water consumption",
              "D. Increased suburban land values",
            ],
            correctAnswer: "B",
            explanation:
              "Paragraph 2 states that cities can 'reduce their reliance on long-distance food transportation, lowering carbon emissions.'",
            hint: { start: 370, end: 500 },
          } satisfies MultipleChoiceQuestion,
          {
            id: "ft-p1-q3",
            type: "matching-heading",
            number: 3,
            text: "Choose the most suitable heading for Paragraph C.",
            options: [
              "i. The rise of technology-driven food production",
              "ii. Key benefits of growing food in cities",
              "iii. Obstacles facing the urban farming industry",
              "iv. The history of community gardening",
            ],
            correctAnswer: "iii. Obstacles facing the urban farming industry",
            explanation:
              "Paragraph C discusses land scarcity, water costs, and economic uncertainty — obstacles to urban farming.",
            hint: { start: 635, end: 850 },
          } satisfies MatchingQuestion,
        ],
      },
      {
        id: "p2",
        title: "Antarctic Research Notes",
        text: ANTARCTIC_TEXT,
        questions: [
          {
            id: "ft-p2-q1",
            type: "fill-in-blank",
            number: 4,
            text: "Antarctica's ___ contains approximately 70 percent of the world's fresh water.",
            correctAnswer: "vast ice sheet",
            explanation:
              "The first paragraph mentions 'the continent's vast ice sheet, which contains approximately 70 percent of the world's fresh water.'",
            hint: { start: 80, end: 165 },
          } satisfies FillInBlankQuestion,
          {
            id: "ft-p2-q2",
            type: "multiple-choice",
            number: 5,
            text: "What do scientists measure from research stations in Antarctica?",
            options: [
              "A. Ocean temperature at the equator",
              "B. Rainfall patterns in the southern hemisphere",
              "C. Changes in the ozone layer above the southern pole",
              "D. Volcanic activity beneath the ice cap",
            ],
            correctAnswer: "C",
            explanation:
              "Paragraph 2 states scientists 'measure shifts in the ozone layer above the southern pole.'",
            hint: { start: 320, end: 420 },
          } satisfies MultipleChoiceQuestion,
          {
            id: "ft-p2-q3",
            type: "matching-information",
            number: 6,
            text: "Which paragraph mentions the possibility of life existing in extreme isolation?",
            options: ["Paragraph A", "Paragraph B", "Paragraph C"],
            correctAnswer: "Paragraph C",
            explanation:
              "Paragraph C discusses subglacial lakes that 'may harbour microbial life forms that have evolved in complete isolation.'",
            hint: { start: 560, end: 750 },
          } satisfies MatchingQuestion,
        ],
      },
      {
        id: "p3",
        title: "The Science of Sleep",
        text: SLEEP_SCIENCE_TEXT,
        questions: [
          {
            id: "ft-p3-q1",
            type: "fill-in-blank",
            number: 7,
            text: "The human body's sleep cycle is governed by a biological clock called the ___.",
            correctAnswer: "circadian rhythm",
            explanation:
              "The first paragraph states: 'Governed by an internal biological clock known as the circadian rhythm.'",
            hint: { start: 85, end: 115 },
          } satisfies FillInBlankQuestion,
          {
            id: "ft-p3-q2",
            type: "multiple-choice",
            number: 8,
            text: "What is the role of the hippocampus during REM sleep?",
            options: [
              "A. It regulates body temperature during rest",
              "B. It transfers information to the prefrontal cortex for long-term storage",
              "C. It generates the rapid eye movement signals",
              "D. It suppresses unwanted memories permanently",
            ],
            correctAnswer: "B",
            explanation:
              "Paragraph 2 explains that 'the hippocampus transfers information to the prefrontal cortex for long-term storage during this stage.'",
            hint: { start: 430, end: 560 },
          } satisfies MultipleChoiceQuestion,
          {
            id: "ft-p3-q3",
            type: "matching-heading",
            number: 9,
            text: "Choose the most suitable heading for Paragraph C.",
            options: [
              "i. How the brain processes memories overnight",
              "ii. The biological purpose of the sleep cycle",
              "iii. Sleep deprivation as a public health issue",
              "iv. The link between REM sleep and creativity",
            ],
            correctAnswer: "iii. Sleep deprivation as a public health issue",
            explanation:
              "Paragraph C focuses on chronic sleep loss as a 'significant public health concern' linked to cardiovascular disease and other disorders.",
            hint: { start: 590, end: 820 },
          } satisfies MatchingQuestion,
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getReadingTest(id: string): ReadingTest | undefined {
  return readingTests.find((t) => t.id === id);
}

export function getAllQuestions(test: ReadingTest): ReadingQuestion[] {
  return test.passages.flatMap((p) => p.questions);
}

export function scoreAttempt(
  test: ReadingTest,
  answers: StudentAnswer[],
): { correct: number; total: number; byQuestion: Record<string, boolean> } {
  const allQ = getAllQuestions(test);
  const byQuestion: Record<string, boolean> = {};

  for (const q of allQ) {
    const answer = answers.find((a) => a.questionId === q.id)?.value ?? "";
    const correct = answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    byQuestion[q.id] = correct;
  }

  const correct = Object.values(byQuestion).filter(Boolean).length;
  return { correct, total: allQ.length, byQuestion };
}

// ─── Admin JSON templates ──────────────────────────────────────────────────────

export const readingAdminTemplates: Record<QuestionType, string> = {
  "fill-in-blank": JSON.stringify(
    {
      title: "Passage 1 — Example Title",
      type: "passage",
      passageNumber: 1,
      timeLimit: 20,
      level: "Band 6.5–7.0",
      passages: [
        {
          id: "p1",
          title: "Passage Title Here",
          text: "Full passage text goes here. It can be multiple paragraphs separated by \\n\\n.",
          questions: [
            {
              id: "p1-q1",
              type: "fill-in-blank",
              number: 1,
              text: "The process is initiated by a ___ in the cell membrane.",
              correctAnswer: "protein receptor",
              explanation:
                "The passage states in paragraph 2 that the process is initiated by a protein receptor in the cell membrane.",
              hint: { start: 120, end: 200 },
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
  "multiple-choice": JSON.stringify(
    {
      title: "Passage 1 — Example Title",
      type: "passage",
      passageNumber: 1,
      timeLimit: 20,
      level: "Band 6.5–7.0",
      passages: [
        {
          id: "p1",
          title: "Passage Title Here",
          text: "Full passage text goes here.",
          questions: [
            {
              id: "p1-q1",
              type: "multiple-choice",
              number: 1,
              text: "According to the passage, what is the primary function of X?",
              options: [
                "A. To regulate temperature",
                "B. To transport nutrients",
                "C. To generate energy",
                "D. To filter toxins",
              ],
              correctAnswer: "B",
              explanation:
                "Paragraph 3 explicitly states that X is responsible for transporting nutrients throughout the system.",
              hint: { start: 250, end: 360 },
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
  "matching-heading": JSON.stringify(
    {
      title: "Passage 1 — Example Title",
      type: "passage",
      passageNumber: 1,
      timeLimit: 20,
      level: "Band 6.5–7.0",
      passages: [
        {
          id: "p1",
          title: "Passage Title Here",
          text: "Full passage text goes here.",
          questions: [
            {
              id: "p1-q1",
              type: "matching-heading",
              number: 1,
              text: "Choose the most suitable heading for Paragraph B.",
              options: [
                "i. Historical background of the discovery",
                "ii. The economic impact on local communities",
                "iii. Scientific evidence supporting the theory",
                "iv. Challenges encountered during research",
              ],
              correctAnswer: "ii. The economic impact on local communities",
              explanation:
                "Paragraph B focuses entirely on how the discovery affected local economies and trade, making heading ii the best fit.",
              hint: { start: 180, end: 320 },
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
  "matching-information": JSON.stringify(
    {
      title: "Passage 1 — Example Title",
      type: "passage",
      passageNumber: 1,
      timeLimit: 20,
      level: "Band 6.5–7.0",
      passages: [
        {
          id: "p1",
          title: "Passage Title Here",
          text: "Full passage text goes here.",
          questions: [
            {
              id: "p1-q1",
              type: "matching-information",
              number: 1,
              text: "Which paragraph mentions the role of government policy in shaping outcomes?",
              options: ["Paragraph A", "Paragraph B", "Paragraph C", "Paragraph D"],
              correctAnswer: "Paragraph C",
              explanation:
                "Paragraph C discusses legislative measures and regulatory frameworks that shaped the industry's development.",
              hint: { start: 480, end: 600 },
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
};

const answerKeyQuestionSchema = z.object({
  number: z.number(),
  type: z.enum(ANSWER_KEY_QUESTION_TYPES),
  answer: z.string(),
  thai_explanation: z.string().default(""),
  paraphrase_links: z
    .array(
      z.object({
        question: z.string(),
        passage: z.string(),
      }),
    )
    .default([]),
  evidence: z.string().default(""),
});

const answerKeyPassageSchema = z.object({
  passage_id: z.number(),
  title: z.string(),
  questions: z.array(answerKeyQuestionSchema),
});

const answerKeyUploadSchema = z.object({
  source_file: z.string().optional(),
  exam: z.string().optional(),
  notes: z.string().optional(),
  passages: z.array(answerKeyPassageSchema).min(1),
});

export const readingSeparateAnswerKeyTemplate = JSON.stringify(
  {
    source_file: "answers.json",
    exam: "IELTS Reading",
    notes:
      "Paste answer key JSON here. Passage text can be added separately in the passage bank.",
    passages: [
      {
        passage_id: 1,
        title: "Passage Title",
        questions: [
          {
            number: 1,
            type: "TRUE_FALSE_NOT_GIVEN",
            answer: "FALSE",
            thai_explanation: "อธิบายคำตอบภาษาไทยตรงนี้",
            paraphrase_links: [
              {
                question: "other parrots share the kakapo's inability to fly",
                passage: "the world's only flightless parrot",
              },
            ],
            evidence: "It is the world's only flightless parrot.",
          },
        ],
      },
    ],
  },
  null,
  2,
);

export const readingSeparatePassageTemplate = JSON.stringify(
  {
    passage_id: 1,
    title: "Passage Title",
    text: "Paste the full passage text here. Use \\n\\n between paragraphs.",
  },
  null,
  2,
);

export function parseReadingAnswerKeyUpload(
  jsonText: string,
): { data?: ReadingAnswerKeyUpload; error?: string } {
  try {
    const parsed = JSON.parse(jsonText);
    const result = answerKeyUploadSchema.safeParse(parsed);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return {
        error:
          firstIssue?.message ??
          "Answer-key JSON does not match the required format.",
      };
    }

    return { data: result.data };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not parse answer-key JSON.",
    };
  }
}

function buildImportedTestId(answerKey: ReadingAnswerKeyUpload) {
  const base =
    answerKey.source_file ??
    answerKey.exam ??
    `reading-import-${answerKey.passages.length}-passages`;

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prettifySourceType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeForSearch(value: string) {
  return value.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').toLowerCase();
}

function findCaseInsensitiveIndex(haystack: string, needle: string) {
  return normalizeForSearch(haystack).indexOf(normalizeForSearch(needle));
}

function buildHintRange(
  passageText: string,
  question: ReadingAnswerKeyQuestionUpload,
): HintRange {
  const candidates = [
    question.evidence,
    ...question.paraphrase_links.map((link) => link.passage),
    question.answer.length > 2 ? question.answer : "",
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const idx = findCaseInsensitiveIndex(passageText, candidate);
    if (idx !== -1) {
      const start = Math.max(0, idx - 18);
      const end = Math.min(passageText.length, idx + candidate.length + 18);
      return { start, end };
    }
  }

  return { start: 0, end: Math.min(passageText.length, 120) };
}

function inferLetterOptions(maxLetter: string | undefined, fallbackMax = "D") {
  const highest = (maxLetter ?? fallbackMax).toUpperCase();
  const end = highest.charCodeAt(0);
  const start = "A".charCodeAt(0);
  const options: string[] = [];

  for (let code = start; code <= end; code += 1) {
    const letter = String.fromCharCode(code);
    options.push(letter);
  }

  return options;
}

function inferQuestionText(question: ReadingAnswerKeyQuestionUpload) {
  const source = question.paraphrase_links[0]?.question?.trim();
  if (source) {
    return source.endsWith("?") ? source : `${source}`;
  }

  return `Question ${question.number}`;
}

function inferInternalQuestion(
  passageId: number,
  question: ReadingAnswerKeyQuestionUpload,
  passageText: string,
  matchingOptions: string[],
  multipleChoiceOptions: string[],
): ReadingQuestion {
  const explanation =
    question.evidence ||
    question.thai_explanation ||
    `Imported from ${prettifySourceType(question.type)} answer key.`;

  const common = {
    id: `import-p${passageId}-q${question.number}`,
    number: question.number,
    explanation,
    hint: buildHintRange(passageText, question),
    sourceType: question.type,
    thaiExplanation: question.thai_explanation,
    evidence: question.evidence,
    paraphraseLinks: question.paraphrase_links,
  };

  switch (question.type) {
    case "TRUE_FALSE_NOT_GIVEN":
      return {
        ...common,
        type: "multiple-choice",
        text: `TRUE / FALSE / NOT GIVEN: ${inferQuestionText(question)}`,
        options: ["A. TRUE", "B. FALSE", "C. NOT GIVEN"],
        correctAnswer:
          question.answer.toUpperCase() === "TRUE"
            ? "A"
            : question.answer.toUpperCase() === "FALSE"
              ? "B"
              : "C",
      } satisfies MultipleChoiceQuestion;
    case "YES_NO_NOT_GIVEN":
      return {
        ...common,
        type: "multiple-choice",
        text: `YES / NO / NOT GIVEN: ${inferQuestionText(question)}`,
        options: ["A. YES", "B. NO", "C. NOT GIVEN"],
        correctAnswer:
          question.answer.toUpperCase() === "YES"
            ? "A"
            : question.answer.toUpperCase() === "NO"
              ? "B"
              : "C",
      } satisfies MultipleChoiceQuestion;
    case "SHORT_ANSWER":
    case "SUMMARY_COMPLETION":
    case "SENTENCE_COMPLETION":
      return {
        ...common,
        type: "fill-in-blank",
        text: inferQuestionText(question),
        correctAnswer: question.answer,
      } satisfies FillInBlankQuestion;
    case "MATCHING_INFORMATION":
    case "MATCHING_PEOPLE":
      return {
        ...common,
        type: "matching-information",
        text: inferQuestionText(question),
        options: matchingOptions,
        correctAnswer: question.answer.toUpperCase(),
      } satisfies MatchingQuestion;
    case "MULTIPLE_CHOICE":
    default:
      return {
        ...common,
        type: "multiple-choice",
        text: inferQuestionText(question),
        options: multipleChoiceOptions,
        correctAnswer: question.answer.toUpperCase(),
      } satisfies MultipleChoiceQuestion;
  }
}

export function buildReadingImportedPackage(
  answerKey: ReadingAnswerKeyUpload,
  passageDrafts: Record<number, ReadingPassageDraft>,
): ReadingImportedTestPackage {
  const importedAt = new Date().toISOString();
  const missingPassageIds: number[] = [];
  const unsupportedQuestionNumbers: number[] = [];

  const passages: ReadingPassage[] = answerKey.passages.map((passage) => {
    const draft = passageDrafts[passage.passage_id];
    const text = draft?.text?.trim() ?? "";

    if (!text) {
      missingPassageIds.push(passage.passage_id);
    }

    const matchingLetters = passage.questions
      .filter(
        (question) =>
          question.type === "MATCHING_INFORMATION" ||
          question.type === "MATCHING_PEOPLE",
      )
      .map((question) => question.answer.trim().charAt(0).toUpperCase())
      .filter(Boolean)
      .sort();

    const mcLetters = passage.questions
      .filter((question) => question.type === "MULTIPLE_CHOICE")
      .map((question) => question.answer.trim().charAt(0).toUpperCase())
      .filter(Boolean)
      .sort();

    const matchingOptions = inferLetterOptions(matchingLetters.at(-1), "G");
    const multipleChoiceOptions = inferLetterOptions(mcLetters.at(-1), "D");

    const questions = passage.questions.map((question) => {
      if (
        question.type === "MULTIPLE_CHOICE" &&
        question.paraphrase_links.length === 0 &&
        !question.evidence
      ) {
        unsupportedQuestionNumbers.push(question.number);
      }

      return inferInternalQuestion(
        passage.passage_id,
        question,
        text,
        matchingOptions,
        multipleChoiceOptions,
      );
    });

    return {
      id: `import-p${passage.passage_id}`,
      title: draft?.title?.trim() || passage.title,
      text,
      questions,
    };
  });

  const test: ReadingTest = {
    id: buildImportedTestId(answerKey),
    title:
      passages.length === 1
        ? `Passage ${answerKey.passages[0]?.passage_id ?? 1} — ${passages[0]?.title ?? "Uploaded"}`
        : `${answerKey.exam ?? "IELTS Reading"} — Uploaded full test`,
    type: passages.length === 1 ? "passage" : "full",
    passageNumber:
      passages.length === 1
        ? ((answerKey.passages[0]?.passage_id ?? 1) as 1 | 2 | 3)
        : undefined,
    passages,
    timeLimit: passages.length === 1 ? 20 : 60,
    level: "Uploaded",
  };

  return {
    id: `reading-import-${buildImportedTestId(answerKey)}`,
    exam: answerKey.exam ?? "IELTS Reading",
    notes: answerKey.notes ?? "",
    sourceFile: answerKey.source_file ?? "Pasted answer key",
    importedAt,
    test,
    passageSlots: Object.fromEntries(
      passages.map((passage, index) => [passage.id, index + 1]),
    ),
    missingPassageIds,
    unsupportedQuestionNumbers,
  };
}

// ─── Entry cards shown on /reading ────────────────────────────────────────────

export const readingEntryCards = [
  {
    id: "rs-passage-1",
    label: "Passage 1",
    description: "Urban Farming Trends",
    level: "Band 6.5–7.0",
    time: "20 min",
    questions: 3,
  },
  {
    id: "rs-passage-2",
    label: "Passage 2",
    description: "Antarctic Research Notes",
    level: "Band 7.0–7.5",
    time: "20 min",
    questions: 3,
  },
  {
    id: "rs-passage-3",
    label: "Passage 3",
    description: "The Science of Sleep",
    level: "Band 7.5–8.0",
    time: "20 min",
    questions: 3,
  },
  {
    id: "rs-full-test-1",
    label: "Full Test",
    description: "All 3 passages — Academic Reading Test 1",
    level: "Band 6.5–8.0",
    time: "60 min",
    questions: 9,
  },
] as const;

export function buildReadingEntryCard(test: ReadingTest) {
  return {
    id: test.id,
    label:
      test.type === "full"
        ? "Full Test"
        : `Passage ${test.passageNumber ?? 1}`,
    description: test.title,
    level: test.level,
    time: `${test.timeLimit} min`,
    questions: test.passages.flatMap((passage) => passage.questions).length,
  };
}
