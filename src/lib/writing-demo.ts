export type WritingTaskSlug = "task-1" | "task-2" | "full-exam";
export type WritingFeedbackCategory =
  | "grammar"
  | "vocabulary"
  | "coherence"
  | "taskAchievement";

export type WritingPrompt = {
  id: string;
  task: Exclude<WritingTaskSlug, "full-exam">;
  testName: string;
  topic: string;
  title: string;
  uploadedAt: string;
  duration: string;
  recommendedWords: string;
  summary: string;
  promptText: string;
  teacherUploadNote: string;
  instructions: string[];
  visual?:
    | {
        type: "chart";
        title: string;
        caption: string;
        bars: { label: string; value: number; color: string }[];
      }
    | {
        type: "image";
        title: string;
        caption: string;
      };
};

export type WritingAnnotation = {
  id: string;
  category: WritingFeedbackCategory;
  paragraphIndex: number;
  scope: "phrase" | "paragraph";
  selectedText: string;
  comment: string;
};

export type WritingSubmission = {
  id: string;
  promptId: string;
  studentName: string;
  teacherName: string;
  submittedAt: string;
  reviewedAt: string;
  response: string;
  additionalComment: string;
  scores: Record<WritingFeedbackCategory, number>;
  totalScore: number;
  status: "awaiting-review" | "reviewed";
  annotations: WritingAnnotation[];
};

export type StoredInlineAnnotation = {
  id: number;
  start: number;
  end: number;
  category: WritingFeedbackCategory;
  inlineComment: string;
  detailComment: string;
};

export type WritingReviewDraft = {
  annotations: StoredInlineAnnotation[];
  scores: Record<WritingFeedbackCategory, number>;
  comment: string;
  reviewSent: boolean;
};

export type TeacherInboxItem = {
  id: string;
  studentName: string;
  promptId: string;
  task: Exclude<WritingTaskSlug, "full-exam">;
  testName: string;
  topic: string;
  title: string;
  submittedAt: string;
  notification: string;
  status: "new" | "opened" | "replied";
};

export const writingTasks = [
  {
    slug: "task-1" as const,
    title: "Task 1",
    href: "/writing/task-1",
  },
  {
    slug: "task-2" as const,
    title: "Task 2",
    href: "/writing/task-2",
  },
  {
    slug: "full-exam" as const,
    title: "Full Exam",
    href: "/writing/full-exam",
  },
];

export const writingFeedbackMeta: Record<
  WritingFeedbackCategory,
  { label: string; color: string; soft: string }
> = {
  grammar: {
    label: "Grammar",
    color: "#ef4444",
    soft: "rgba(239, 68, 68, 0.14)",
  },
  vocabulary: {
    label: "Vocabulary",
    color: "#38bdf8",
    soft: "rgba(56, 189, 248, 0.18)",
  },
  coherence: {
    label: "Coherence",
    color: "#84cc16",
    soft: "rgba(132, 204, 22, 0.16)",
  },
  taskAchievement: {
    label: "Task achievement",
    color: "#facc15",
    soft: "rgba(250, 204, 21, 0.22)",
  },
};

export const writingPrompts: WritingPrompt[] = [
  {
    id: "task1-housing-2040",
    task: "task-1",
    testName: "Urban Futures Mock 04",
    topic: "Housing trends",
    title: "Housing patterns in Metrovale from 2000 to 2040",
    uploadedAt: "2026-04-15",
    duration: "20 minutes",
    recommendedWords: "150+ words",
    summary:
      "Summarise the key changes in the housing distribution, comparing apartments, townhouses, and detached homes.",
    promptText:
      "The chart below shows the percentage of three housing types in Metrovale between 2000 and 2040. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    teacherUploadNote:
      "Uploaded by teacher as Task 1 with chart data, test title, and housing-theme metadata.",
    instructions: [
      "Highlight the overall trend before describing smaller details.",
      "Compare at least two categories directly.",
      "Keep your tone objective and data-focused.",
    ],
    visual: {
      type: "chart",
      title: "Housing percentage by year",
      caption: "Apartment living rises sharply while detached homes decline.",
      bars: [
        { label: "Apartments", value: 68, color: "#004aad" },
        { label: "Townhouses", value: 43, color: "#ffcc00" },
        { label: "Detached homes", value: 26, color: "#7c3aed" },
      ],
    },
  },
  {
    id: "task1-transport-map",
    task: "task-1",
    testName: "Mobility Mock 02",
    topic: "Transport map",
    title: "Changes to the Riverside transport interchange",
    uploadedAt: "2026-04-12",
    duration: "20 minutes",
    recommendedWords: "150+ words",
    summary:
      "Describe the main developments to the interchange, focusing on movement and accessibility.",
    promptText:
      "The diagrams below show how the Riverside transport interchange has changed since 2010. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    teacherUploadNote:
      "Uploaded by teacher with map visuals and a route-planning description for Task 1 practice.",
    instructions: [
      "Describe the layout before discussing improvements.",
      "Group changes by area to keep your report organised.",
      "Use location phrases precisely.",
    ],
    visual: {
      type: "image",
      title: "Interchange before and after",
      caption: "Map-based comparison placeholder for the uploaded diagram.",
    },
  },
  {
    id: "task2-remote-work",
    task: "task-2",
    testName: "Modern Work Mock 07",
    topic: "Remote work",
    title: "Should remote work remain the default option?",
    uploadedAt: "2026-04-16",
    duration: "40 minutes",
    recommendedWords: "250+ words",
    summary:
      "Discuss both the benefits and risks of keeping remote work as the default model for office-based teams.",
    promptText:
      "Some people believe that remote work should remain the default arrangement for office-based employees, while others think companies should return to fully in-person working. Discuss both views and give your own opinion.",
    teacherUploadNote:
      "Uploaded by teacher as a Task 2 discussion essay with named topic, test series, and prompt stem.",
    instructions: [
      "Address both sides before making your position clear.",
      "Support each main point with a specific example or implication.",
      "Finish with a conclusion that matches your argument.",
    ],
  },
  {
    id: "task2-ai-education",
    task: "task-2",
    testName: "Education Mock 11",
    topic: "AI in schools",
    title: "Will AI improve education more than it harms it?",
    uploadedAt: "2026-04-10",
    duration: "40 minutes",
    recommendedWords: "250+ words",
    summary:
      "Give a balanced response on whether AI tools are ultimately positive for school learning.",
    promptText:
      "Artificial intelligence tools are becoming common in schools. Some people think this development will greatly improve education, while others believe it will create serious problems. To what extent do you agree or disagree?",
    teacherUploadNote:
      "Uploaded by teacher as a Task 2 opinion essay with classroom technology metadata.",
    instructions: [
      "Make your position explicit in the introduction.",
      "Use topic sentences that show the logic of your argument.",
      "Avoid repeating the same examples in multiple paragraphs.",
    ],
  },
];

export const writingExamBundle = {
  id: "exam-sim-01",
  title: "Full Writing Exam Simulation",
  duration: "60 minutes",
  description:
    "Students complete one Task 1 report and one Task 2 essay back to back with clear timing and submission checkpoints.",
  promptIds: ["task1-housing-2040", "task2-remote-work"],
};

export const writingSubmissions: WritingSubmission[] = [
  {
    id: "submission-01",
    promptId: "task2-remote-work",
    studentName: "Nina Patel",
    teacherName: "Mr. Arun",
    submittedAt: "Today, 10:40",
    reviewedAt: "Today, 12:05",
    response:
      "Remote work has changed the structure of office life in a very short time. Many companies kept it because employees can save commuting time and organise their day with more flexibility. This can improve morale and help some workers focus better, especially when they have tasks that need long periods of concentration.\n\nHowever, making remote work the default for every company can also weaken communication. In some teams, junior staff learn by observing others in person, and that process becomes slower online. Another issue is that collaboration may look efficient on screen while actually becoming more fragmented, because people only speak when meetings are scheduled.\n\nIn my opinion, remote work should remain a strong option, but not always the default. A mixed system gives workers flexibility while preserving face-to-face contact for planning, mentoring, and problem-solving. This approach is more realistic because different industries and teams have different needs.\n\nOverall, remote work offers clear benefits, but a balanced arrangement is more effective than insisting on a completely remote model for all office-based employees.",
    additionalComment:
      "Your essay has a clear position and a sensible structure. The next step is to sharpen topic sentences and make some examples more concrete so your argument feels more convincing.",
    scores: {
      grammar: 6.5,
      vocabulary: 7,
      coherence: 6.5,
      taskAchievement: 7,
    },
    totalScore: 7,
    status: "reviewed",
    annotations: [
      {
        id: "ann-1",
        category: "grammar",
        paragraphIndex: 1,
        scope: "phrase",
        selectedText: "that process becomes slower online",
        comment:
          "Good idea, but the sentence would be stronger with a more specific subject and a clearer cause-effect structure.",
      },
      {
        id: "ann-2",
        category: "coherence",
        paragraphIndex: 2,
        scope: "paragraph",
        selectedText:
          "In my opinion, remote work should remain a strong option, but not always the default.",
        comment:
          "This paragraph has the right main point. Add one sentence explaining why hybrid work balances autonomy with team learning to make the logic feel more complete.",
      },
      {
        id: "ann-3",
        category: "vocabulary",
        paragraphIndex: 0,
        scope: "phrase",
        selectedText: "organise their day with more flexibility",
        comment:
          "Try a more precise collocation such as 'structure their working day more flexibly' for a slightly more academic tone.",
      },
      {
        id: "ann-4",
        category: "taskAchievement",
        paragraphIndex: 3,
        scope: "paragraph",
        selectedText:
          "Overall, remote work offers clear benefits, but a balanced arrangement is more effective",
        comment:
          "The conclusion matches your opinion well. To push this higher, restate the central reason behind your judgement more explicitly.",
      },
    ],
  },
  {
    id: "submission-02",
    promptId: "task1-housing-2040",
    studentName: "Luca Chen",
    teacherName: "Ms. Mali",
    submittedAt: "Today, 09:55",
    reviewedAt: "Pending",
    response:
      "The chart illustrates the proportion of apartments, townhouses and detached homes in Metrovale over a period of forty years. Overall, apartment living became much more common, whereas detached homes showed the opposite trend.\n\nAt the start of the period, detached homes represented the biggest share of housing, but this figure fell steadily in the following decades. By contrast, apartments rose significantly and became the most dominant category by the end of the timeline. Townhouses also increased, although the change was less dramatic than the rise in apartments.\n\nIn 2040, apartments accounted for well over half of all housing, while detached homes made up only a relatively small minority. Townhouses remained in the middle position throughout the chart.",
    additionalComment: "",
    scores: {
      grammar: 0,
      vocabulary: 0,
      coherence: 0,
      taskAchievement: 0,
    },
    totalScore: 0,
    status: "awaiting-review",
    annotations: [],
  },
];

export const teacherInbox: TeacherInboxItem[] = [
  {
    id: "submission-02",
    studentName: "Luca Chen",
    promptId: "task1-housing-2040",
    task: "task-1",
    testName: "Urban Futures Mock 04",
    topic: "Housing trends",
    title: "Housing patterns in Metrovale from 2000 to 2040",
    submittedAt: "Today, 09:55",
    notification: "New Task 1 script needs marking.",
    status: "new",
  },
  {
    id: "submission-01",
    studentName: "Nina Patel",
    promptId: "task2-remote-work",
    task: "task-2",
    testName: "Modern Work Mock 07",
    topic: "Remote work",
    title: "Should remote work remain the default option?",
    submittedAt: "Today, 10:40",
    notification: "Review sent back. Student report is ready.",
    status: "replied",
  },
];

export const writingUploadTemplates: Record<"task-1" | "task-2", string> = {
  "task-1": JSON.stringify(
    {
      task: "task-1",
      testName: "Academic Mock 12",
      title: "Population change in three cities",
      topic: "Population trends",
      uploadedAt: "2026-04-17",
      promptText:
        "The chart below shows population change in three cities from 1990 to 2020. Summarise the information by selecting and reporting the main features.",
      visual: { type: "chart", title: "Population chart" },
    },
    null,
    2,
  ),
  "task-2": JSON.stringify(
    {
      task: "task-2",
      testName: "Academic Mock 12",
      title: "Should public transport be free?",
      topic: "Public transport",
      uploadedAt: "2026-04-17",
      promptText:
        "Some people think public transport should be free for everyone. To what extent do you agree or disagree?",
    },
    null,
    2,
  ),
};

export function getWritingTaskLabel(task: WritingTaskSlug) {
  return writingTasks.find((item) => item.slug === task)?.title ?? task;
}

export function getWritingPromptsByTask(task: Exclude<WritingTaskSlug, "full-exam">) {
  return writingPrompts.filter((prompt) => prompt.task === task);
}

export function getWritingPrompt(promptId: string) {
  return writingPrompts.find((prompt) => prompt.id === promptId);
}

export function getWritingSubmission(submissionId: string) {
  return writingSubmissions.find((submission) => submission.id === submissionId);
}

export function getSubmissionPrompt(submissionId: string) {
  const submission = getWritingSubmission(submissionId);
  if (!submission) {
    return undefined;
  }

  return getWritingPrompt(submission.promptId);
}

export function getWritingReviewDraftKey(submissionId: string) {
  return `engmatch-writing-review-${submissionId}`;
}

export function readWritingReviewDraft(submissionId: string): WritingReviewDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getWritingReviewDraftKey(submissionId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as WritingReviewDraft;
    return {
      ...parsed,
      annotations: parsed.annotations.map((annotation) => ({
        ...annotation,
        inlineComment:
          "inlineComment" in annotation
            ? annotation.inlineComment
            : (annotation as StoredInlineAnnotation & { text?: string }).text ?? "",
        detailComment:
          "detailComment" in annotation
            ? annotation.detailComment
            : (annotation as StoredInlineAnnotation & { text?: string }).text ?? "",
      })),
    };
  } catch {
    return null;
  }
}

export function writeWritingReviewDraft(submissionId: string, draft: WritingReviewDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getWritingReviewDraftKey(submissionId), JSON.stringify(draft));
}
