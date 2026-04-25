export type SkillArea = "listening" | "reading" | "speaking" | "writing";

export type FeatureCard = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  stats: string[];
};

export type ApiPreview = {
  id: string;
  label: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
};

export const skillCards: FeatureCard[] = [
  {
    href: "/listening",
    eyebrow: "Audio accuracy",
    title: "Listening Lab",
    description:
      "Warm up with section drills, round-based practice, and quick analytics for accent handling, distractors, and speed.",
    stats: ["4 drill categories", "Round practice", "Result snapshots"],
  },
  {
    href: "/reading",
    eyebrow: "Speed + precision",
    title: "Reading Studio",
    description:
      "Preview passage sets, review weak question types, and jump into a guided demo for timed reading flow.",
    stats: ["Demo passage", "Review mode", "Accuracy analytics"],
  },
  {
    href: "/speaking",
    eyebrow: "Interview fluency",
    title: "Speaking Coach",
    description:
      "Run part 1/2/3 packs in mock, practice, or intensive mode with live transcript and AI feedback.",
    stats: ["Part 1/2/3", "Mock + intensive", "Band tracking"],
  },
  {
    href: "/writing",
    eyebrow: "Task response",
    title: "Writing Desk",
    description:
      "Browse prompt detail pages, draft submissions, and review a report layout for a full essay feedback flow.",
    stats: ["Task 1 + 2", "Prompt pages", "Submission report"],
  },
];

export const utilityCards: FeatureCard[] = [
  {
    href: "/notebook",
    eyebrow: "Vocabulary",
    title: "Notebook",
    description:
      "Track saved words and organize them into categories that can later be synced with reading and listening practice.",
    stats: ["Saved terms", "Category chips", "Revision-ready"],
  },
  {
    href: "/notifications",
    eyebrow: "Momentum",
    title: "Notifications",
    description:
      "Keep tabs on streak nudges, admin announcements, and reminders to revisit unfinished practice sessions.",
    stats: ["Practice nudges", "Admin alerts", "Upcoming reviews"],
  },
  {
    href: "/practice/reading/demo",
    eyebrow: "Quick start",
    title: "Reading Demo",
    description:
      "A single-page sample that helps you start reading practice quickly.",
    stats: ["Quick warm-up", "No setup", "Fast start"],
  },
];

export const adminCards: FeatureCard[] = [
  {
    href: "/admin/listening",
    eyebrow: "Content ops",
    title: "Listening Admin",
    description:
      "Manage set publishing, inspect draft counts, and keep category coverage balanced across rounds.",
    stats: ["Set queue", "Draft tracker", "Coverage view"],
  },
  {
    href: "/admin/speaking",
    eyebrow: "Speaking ops",
    title: "Speaking Admin",
    description:
      "Bulk upload speaking packs, review student submissions, and validate AI reports after listening to audio.",
    stats: ["JSON bulk upload", "Validation queue", "Audio review"],
  },
  {
    href: "/admin/writing",
    eyebrow: "Review ops",
    title: "Writing Admin",
    description:
      "Moderate prompts, triage submissions, and jump into a reviews board for essay quality control.",
    stats: ["Prompt status", "Submission queue", "Reviews board"],
  },
  {
    href: "/admin/reading",
    eyebrow: "Content ops",
    title: "Reading Admin",
    description:
      "Upload passage tests via JSON, manage question banks, and configure hint ranges for student guidance.",
    stats: ["JSON upload", "Question bank", "Hint authoring"],
  },
];

export const listeningCategories = [
  "form-completion",
  "multiple-choice",
  "map-labelling",
  "sentence-completion",
];

export const readingCategories = [
  "matching-headings",
  "true-false-not-given",
  "summary-completion",
  "multiple-choice",
];

export const speakingParts = ["1", "2", "3"];
export const writingTasks = ["task-1", "task-2"];

export const notebookCategories = [
  "Academic verbs",
  "Education",
  "Technology",
  "Environment",
];

export const notifications = [
  {
    id: "n-1",
    title: "Reading review is ready",
    description: "Your matching-headings set is prepared for a second pass.",
  },
  {
    id: "n-2",
    title: "Speaking round refreshed",
    description: "Three new cue cards were added to the part 2 rotation.",
  },
  {
    id: "n-3",
    title: "Writing draft reminder",
    description: "You still have one task 2 draft waiting for a final polish.",
  },
];

export const apiPreviews: ApiPreview[] = [
  {
    id: "listening-sets",
    label: "Listening sets",
    method: "GET",
    path: "/api/listening/sets",
    summary: "Returns listening practice sets.",
  },
  {
    id: "reading-analytics",
    label: "Reading analytics",
    method: "GET",
    path: "/api/reading/analytics",
    summary: "Summarizes practice accuracy and time-per-question trends.",
  },
  {
    id: "writing-submissions",
    label: "Writing submissions",
    method: "GET",
    path: "/api/writing/submissions",
    summary: "Lists writing submissions and review drafts.",
  },
];

export const demoSets = {
  listening: [
    { id: "ls-101", title: "Campus Tour Essentials", level: "Band 6.0-6.5" },
    { id: "ls-102", title: "Library Orientation", level: "Band 6.5-7.0" },
  ],
  reading: [
    { id: "rs-201", title: "Urban Farming Trends", level: "Band 6.5-7.0" },
    { id: "rs-202", title: "Antarctic Research Notes", level: "Band 7.0-7.5" },
  ],
  speaking: [
    { id: "sp-301", title: "Describe a memorable teacher", part: "2" },
    { id: "sp-302", title: "Technology in education", part: "3" },
  ],
  writing: [
    { id: "wr-401", title: "Population graph comparison", task: "task-1" },
    { id: "wr-402", title: "Remote work advantages", task: "task-2" },
  ],
};

export const adminQueues = {
  listening: [
    { id: "alq-1", label: "Draft listening sets", value: "12" },
    { id: "alq-2", label: "Awaiting audio QA", value: "4" },
    { id: "alq-3", label: "Published this week", value: "9" },
  ],
  speaking: [
    { id: "asq-1", label: "Active rounds", value: "6" },
    { id: "asq-2", label: "Topics in review", value: "18" },
    { id: "asq-3", label: "Report presets", value: "3" },
  ],
  writing: [
    { id: "awq-1", label: "Open submissions", value: "27" },
    { id: "awq-2", label: "Prompts pending edit", value: "5" },
    { id: "awq-3", label: "Reviewed today", value: "14" },
  ],
};
