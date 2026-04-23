export type SpeakingMode = "part-1" | "part-2" | "part-3" | "full-test";

/** A single tip card shown in the pre-test tips popup */
export type SpeakingTip = {
  type: "grammar" | "vocabulary" | "pattern";
  title: string;
  body: string;
  examples?: string[];
};

export type SpeakingQuestion = {
  id: string;
  prompt: string;
  ttsText: string;
  /** Pre-generated base64 audio from Deepgram TTS (data:audio/mp3;base64,…) */
  ttsAudioUrl?: string;
  mockTranscript: string;
};

export type SpeakingProviderConfig = {
  thumbnailName: string;
  ttsAssetName: string;
  ttsVoice: string;
  transcriptionProvider: "deepgram";
  transcriptionModel: string;
  language: string;
};

export type SpeakingQuickfireTest = {
  id: string;
  mode: "part-1" | "part-3";
  name: string;
  uploadedAt: string;
  topic: string;
  provider: SpeakingProviderConfig;
  questions: SpeakingQuestion[];
  /** Pack-level tips shown in the pre-test popup */
  tips?: SpeakingTip[];
};

export type SpeakingCueCardTest = {
  id: string;
  mode: "part-2";
  name: string;
  uploadedAt: string;
  topic: string;
  provider: SpeakingProviderConfig;
  question: SpeakingQuestion;
  preparationOptions: number[];
};

export type SpeakingFullMockTest = {
  id: string;
  mode: "full-test";
  name: string;
  uploadedAt: string;
  topic: string;
  provider: SpeakingProviderConfig;
  part1: SpeakingQuestion[];
  part2: SpeakingQuestion;
  part3: SpeakingQuestion[];
};

export type SpeakingAnyTest =
  | SpeakingQuickfireTest
  | SpeakingCueCardTest
  | SpeakingFullMockTest;

export const speakingModes: { slug: SpeakingMode; title: string; href: string }[] = [
  { slug: "part-1", title: "Part 1", href: "/speaking/part-1" },
  { slug: "part-2", title: "Part 2", href: "/speaking/part-2" },
  { slug: "part-3", title: "Part 3", href: "/speaking/part-3" },
  { slug: "full-test", title: "Full Test", href: "/speaking/full-test" },
];

const defaultProvider: SpeakingProviderConfig = {
  thumbnailName: "speaking-room-thumb-a.png",
  ttsAssetName: "deepgram-speaking-audio-a.mp3",
  ttsVoice: "aura-asteria-en",
  transcriptionProvider: "deepgram",
  transcriptionModel: "nova-3",
  language: "en-US",
};

export const speakingQuickfireTests: SpeakingQuickfireTest[] = [
  {
    id: "p1-daily-routine-01",
    mode: "part-1",
    name: "Daily Life Warmup 01",
    uploadedAt: "2026-04-17",
    topic: "Daily routine",
    provider: defaultProvider,
    tips: [
      {
        type: "grammar",
        title: "Present simple for habits",
        body: "Use the present simple tense to describe routine activities. Pair it with frequency adverbs to sound natural.",
        examples: ["I usually enjoy my mornings.", "She rarely skips breakfast."],
      },
      {
        type: "vocabulary",
        title: "Routine & schedule words",
        body: "Use these words to talk about your day more precisely and sound more natural.",
        examples: ["structured, productive, hectic, flexible, mundane, refreshing, commute"],
      },
      {
        type: "pattern",
        title: "Reason + result structure",
        body: "Give your reason first, then explain the result. This adds depth to a short answer.",
        examples: [
          "Because I plan my day early, I feel less stressed overall.",
          "Since I started exercising in the morning, my focus has improved.",
        ],
      },
    ],
    questions: [
      {
        id: "p1-q1",
        prompt: "Do you usually enjoy your mornings?",
        ttsText: "Question one. Do you usually enjoy your mornings?",
        mockTranscript:
          "I usually enjoy my mornings because I can plan my day more clearly and I feel more productive before the city becomes busy.",
      },
      {
        id: "p1-q2",
        prompt: "What do you normally do before you leave home?",
        ttsText: "Question two. What do you normally do before you leave home?",
        mockTranscript:
          "Before I leave home I normally check my schedule, prepare a simple breakfast, and make sure I have everything I need for work or study.",
      },
      {
        id: "p1-q3",
        prompt: "Has your morning routine changed in recent years?",
        ttsText: "Question three. Has your morning routine changed in recent years?",
        mockTranscript:
          "Yes, it has changed because I am more careful with time management now, so my routine is more structured than it used to be.",
      },
      {
        id: "p1-q4",
        prompt: "Do you prefer a busy day or a relaxed day?",
        ttsText: "Question four. Do you prefer a busy day or a relaxed day?",
        mockTranscript:
          "I prefer a balanced day because being busy keeps me focused, but I also need some quiet time so I do not feel exhausted.",
      },
      {
        id: "p1-q5",
        prompt: "Would you like to change anything about your daily schedule?",
        ttsText: "Question five. Would you like to change anything about your daily schedule?",
        mockTranscript:
          "I would like to leave more space for exercise and reading, because those habits improve my energy and concentration.",
      },
    ],
  },
  {
    id: "p1-hometown-02",
    mode: "part-1",
    name: "Hometown Warmup 02",
    uploadedAt: "2026-04-14",
    topic: "Hometown",
    provider: {
      ...defaultProvider,
      thumbnailName: "old-town-thumb-b.png",
      ttsAssetName: "deepgram-speaking-audio-b.mp3",
    },
    tips: [
      {
        type: "grammar",
        title: "Comparatives for change",
        body: "Use comparative structures to describe how your hometown has changed over time.",
        examples: [
          "It is more developed now than it was ten years ago.",
          "The town has become much busier since the new road opened.",
        ],
      },
      {
        type: "vocabulary",
        title: "Describing places",
        body: "Use descriptive adjectives and location words to paint a clear picture.",
        examples: ["vibrant, close-knit, sprawling, rural, urban, diverse, nostalgic, thriving"],
      },
      {
        type: "pattern",
        title: "Concession + contrast",
        body: "Acknowledge both sides of your hometown to give a balanced, nuanced answer.",
        examples: [
          "Although the city has grown, it still has a friendly community feel.",
          "Even though transport is better, some green spaces have been lost.",
        ],
      },
    ],
    questions: [
      {
        id: "p1b-q1",
        prompt: "What do you like most about your hometown?",
        ttsText: "Question one. What do you like most about your hometown?",
        mockTranscript:
          "What I like most is the feeling of familiarity, because even though it is developing quickly it still feels welcoming and easy to navigate.",
      },
      {
        id: "p1b-q2",
        prompt: "Is your hometown a good place for young people?",
        ttsText: "Question two. Is your hometown a good place for young people?",
        mockTranscript:
          "Yes, I think it is, since there are more opportunities for education and entertainment now than there were a few years ago.",
      },
      {
        id: "p1b-q3",
        prompt: "How has your hometown changed?",
        ttsText: "Question three. How has your hometown changed?",
        mockTranscript:
          "It has become more modern, with better transport and more businesses, although some traditional places have disappeared.",
      },
      {
        id: "p1b-q4",
        prompt: "Do you think you will live there in the future?",
        ttsText: "Question four. Do you think you will live there in the future?",
        mockTranscript:
          "Possibly, because I still feel connected to it, but it would depend on work opportunities and the lifestyle I want later on.",
      },
      {
        id: "p1b-q5",
        prompt: "What would you improve in your hometown?",
        ttsText: "Question five. What would you improve in your hometown?",
        mockTranscript:
          "I would improve public spaces and green areas, because a growing town needs more places where people can relax and exercise.",
      },
    ],
  },
];

export const speakingCueCardTests: SpeakingCueCardTest[] = [
  {
    id: "p2-helpful-person-01",
    mode: "part-2",
    name: "Cue Card 01",
    uploadedAt: "2026-04-17",
    topic: "People",
    provider: {
      ...defaultProvider,
      thumbnailName: "helpful-person-thumb.png",
      ttsAssetName: "deepgram-cue-card-a.mp3",
    },
    preparationOptions: [1, 2, 3],
    question: {
      id: "p2-q1",
      prompt:
        "Describe a person who gave you very useful advice. You should say who the person is, when this happened, what advice they gave, and explain why it was useful for you.",
      ttsText:
        "Part two. Describe a person who gave you very useful advice. You should say who the person is, when this happened, what advice they gave, and explain why it was useful for you.",
      mockTranscript:
        "I would like to talk about my older cousin, who gave me very useful advice when I was choosing my university major. At that time, I was uncertain and I was thinking too much about what other people expected. She told me to choose a subject that matched both my strengths and my curiosity, because motivation matters in the long term. This advice was useful because it helped me make a calmer and more confident decision, and I still rely on that way of thinking today.",
    },
  },
  {
    id: "p2-city-visit-02",
    mode: "part-2",
    name: "Cue Card 02",
    uploadedAt: "2026-04-12",
    topic: "Places",
    provider: {
      ...defaultProvider,
      thumbnailName: "city-trip-thumb.png",
      ttsAssetName: "deepgram-cue-card-b.mp3",
    },
    preparationOptions: [1, 2],
    question: {
      id: "p2-q2",
      prompt:
        "Describe a city you would like to visit for a short trip. You should say where it is, what you would do there, who you would go with, and explain why you would like to visit it.",
      ttsText:
        "Part two. Describe a city you would like to visit for a short trip. You should say where it is, what you would do there, who you would go with, and explain why you would like to visit it.",
      mockTranscript:
        "A city I would like to visit for a short trip is Kyoto in Japan. I would mainly go there to explore the temples, traditional streets, and local food. I would probably travel with one close friend who also enjoys cultural travel, because that would make the trip more memorable. I would like to visit Kyoto because it seems peaceful, visually beautiful, and very different from the fast pace of my normal routine.",
    },
  },
];

export const speakingPart3Tests: SpeakingQuickfireTest[] = [
  {
    id: "p3-education-01",
    mode: "part-3",
    name: "Education Discussion 01",
    uploadedAt: "2026-04-17",
    topic: "Education",
    provider: {
      ...defaultProvider,
      thumbnailName: "education-discussion-thumb.png",
      ttsAssetName: "deepgram-speaking-audio-c.mp3",
    },
    questions: [
      {
        id: "p3-q1",
        prompt: "Why do some students perform better in discussion-based classes?",
        ttsText:
          "Question one. Why do some students perform better in discussion based classes?",
        mockTranscript:
          "Some students perform better because discussion gives them the chance to test ideas actively instead of only receiving information passively.",
      },
      {
        id: "p3-q2",
        prompt: "Should schools focus more on practical skills than theory?",
        ttsText:
          "Question two. Should schools focus more on practical skills than theory?",
        mockTranscript:
          "I think schools should balance both, because theory provides understanding while practical skills make learning useful in real life.",
      },
      {
        id: "p3-q3",
        prompt: "How has technology changed the way people learn?",
        ttsText:
          "Question three. How has technology changed the way people learn?",
        mockTranscript:
          "Technology has made learning more flexible, since people can access lessons, explanations, and practice materials whenever they need them.",
      },
      {
        id: "p3-q4",
        prompt: "Do you think online education can replace face-to-face learning?",
        ttsText:
          "Question four. Do you think online education can replace face to face learning?",
        mockTranscript:
          "Not completely, because online education is convenient, but in-person learning still supports stronger interaction and immediate feedback.",
      },
      {
        id: "p3-q5",
        prompt: "What qualities make a teacher effective today?",
        ttsText:
          "Question five. What qualities make a teacher effective today?",
        mockTranscript:
          "An effective teacher needs clear communication, adaptability, and the ability to keep students engaged in different learning environments.",
      },
    ],
  },
];

export const speakingFullMockTests: SpeakingFullMockTest[] = [
  {
    id: "full-speaking-01",
    mode: "full-test",
    name: "Full Speaking Mock 01",
    uploadedAt: "2026-04-17",
    topic: "Daily life, people, and education",
    provider: {
      ...defaultProvider,
      thumbnailName: "full-speaking-mock-thumb.png",
      ttsAssetName: "deepgram-full-mock-a.mp3",
    },
    part1: speakingQuickfireTests[0].questions,
    part2: speakingCueCardTests[0].question,
    part3: speakingPart3Tests[0].questions,
  },
];

export const speakingUploadTemplates: Record<"part-1" | "part-2" | "part-3", string> = {
  "part-1": JSON.stringify(
    {
      id: "p1-your-test-id",
      mode: "part-1",
      name: "Films & Cinema",
      uploadedAt: "2026-04-21",
      topic: "Films & Cinema",
      provider: {
        thumbnailName: "cinema-thumb.png",
        ttsAssetName: "deepgram-p1-cinema.mp3",
        ttsVoice: "aura-asteria-en",
        transcriptionProvider: "deepgram",
        transcriptionModel: "nova-3",
        language: "en-US",
      },
      tips: [
        {
          type: "grammar",
          title: "Frequency adverbs",
          body: "Use frequency adverbs before the main verb or after 'be' to describe how often you do things.",
          examples: [
            "I occasionally go to the cinema.",
            "Tickets are rarely affordable these days.",
          ],
        },
        {
          type: "vocabulary",
          title: "Cinema & film vocabulary",
          body: "Use topic-specific vocabulary to sound more precise and natural.",
          examples: [
            "blockbuster, box office, genre, subtitles, dubbed, screenplay, acclaimed, immersive",
          ],
        },
        {
          type: "pattern",
          title: "Opinion + reason structure",
          body: "State your opinion clearly, then support it with a reason or example.",
          examples: [
            "I think watching films at the cinema is more enjoyable because the sound and screen create a stronger experience.",
            "In my view, ticket prices are quite high, which is why I mostly stream films at home.",
          ],
        },
      ],
      questions: [
        {
          id: "p1-q1",
          prompt: "How often do you go to the cinema?",
          ttsText: "Question one. How often do you go to the cinema?",
          mockTranscript: "I go to the cinema about once a month, usually when a big film I am interested in comes out.",
        },
        {
          id: "p1-q2",
          prompt: "Are cinema tickets expensive in your country?",
          ttsText: "Question two. Are cinema tickets expensive in your country?",
          mockTranscript: "Yes, they are quite expensive compared to streaming services, so I tend to choose carefully which films to see.",
        },
        {
          id: "p1-q3",
          prompt: "What are the advantages of seeing a film at the cinema?",
          ttsText: "Question three. What are the advantages of seeing a film at the cinema?",
          mockTranscript: "The main advantage is the immersive experience — the large screen and powerful sound make the film much more engaging.",
        },
        {
          id: "p1-q4",
          prompt: "Do you usually watch films alone or with others?",
          ttsText: "Question four. Do you usually watch films alone or with others?",
          mockTranscript: "I usually watch films with friends because it is more fun to discuss the story afterwards.",
        },
        {
          id: "p1-q5",
          prompt: "Which actor would you like to play you in a film?",
          ttsText: "Question five. Which actor would you like to play you in a film?",
          mockTranscript: "That is a fun question. I think I would choose someone who can show both quiet determination and humour, so perhaps someone versatile like that.",
        },
        {
          id: "p1-q6",
          prompt: "How do you listen to music?",
          ttsText: "Question six. How do you listen to music?",
          mockTranscript: "I mostly listen through streaming apps on my phone, often using headphones when I am commuting or exercising.",
        },
      ],
    },
    null,
    2,
  ),
  "part-2": JSON.stringify(
    {
      id: "p2-your-test-id",
      mode: "part-2",
      name: "Cue Card Pack",
      uploadedAt: "2026-04-17",
      topic: "Important experiences",
      provider: {
        thumbnailName: "important-experience-thumb.png",
        ttsAssetName: "deepgram-p2-important-experience.mp3",
        ttsVoice: "aura-asteria-en",
        transcriptionProvider: "deepgram",
        transcriptionModel: "nova-3",
        language: "en-US",
      },
      preparationOptions: [1, 2, 3],
      question: {
        id: "p2-q1",
        prompt:
          "Describe an experience that taught you an important lesson. You should say what happened, when it happened, who was involved, and explain what lesson you learned.",
        ttsText:
          "Part two. Describe an experience that taught you an important lesson. You should say what happened, when it happened, who was involved, and explain what lesson you learned.",
        mockTranscript:
          "An experience that taught me an important lesson was working on a group project at university...",
      },
    },
    null,
    2,
  ),
  "part-3": JSON.stringify(
    {
      id: "p3-your-test-id",
      mode: "part-3",
      name: "Discussion Pack",
      uploadedAt: "2026-04-17",
      topic: "Society and change",
      provider: {
        thumbnailName: "society-change-thumb.png",
        ttsAssetName: "deepgram-p3-society-change.mp3",
        ttsVoice: "aura-asteria-en",
        transcriptionProvider: "deepgram",
        transcriptionModel: "nova-3",
        language: "en-US",
      },
      questions: [
        {
          id: "p3-q1",
          prompt: "Why do some communities change faster than others?",
          ttsText: "Question one. Why do some communities change faster than others?",
          mockTranscript: "Some communities change faster because they have stronger investment, better transport, and more access to information.",
        },
        {
          id: "p3-q2",
          prompt: "Do you think change is always positive?",
          ttsText: "Question two. Do you think change is always positive?",
          mockTranscript: "Not always, because some changes improve efficiency while others damage traditions or social stability.",
        },
        {
          id: "p3-q3",
          prompt: "How can governments prepare people for social change?",
          ttsText: "Question three. How can governments prepare people for social change?",
          mockTranscript: "Governments can prepare people through education, public communication, and practical support during transitions.",
        },
        {
          id: "p3-q4",
          prompt: "What role does education play in helping people adapt?",
          ttsText: "Question four. What role does education play in helping people adapt?",
          mockTranscript: "Education gives people the knowledge and confidence they need to respond to change more effectively.",
        },
        {
          id: "p3-q5",
          prompt: "Do young people adapt more easily than older people?",
          ttsText: "Question five. Do young people adapt more easily than older people?",
          mockTranscript: "In many cases they do, because they are often more familiar with new systems and less tied to old routines.",
        },
      ],
    },
    null,
    2,
  ),
};

export function getSpeakingModeLabel(mode: SpeakingMode) {
  return speakingModes.find((item) => item.slug === mode)?.title ?? mode;
}

export function getSpeakingTestsByMode(mode: SpeakingMode) {
  if (mode === "part-1") return speakingQuickfireTests;
  if (mode === "part-2") return speakingCueCardTests;
  if (mode === "part-3") return speakingPart3Tests;
  return speakingFullMockTests;
}

export function getSpeakingTest(mode: SpeakingMode, testId: string) {
  return getSpeakingTestsByMode(mode).find((test) => test.id === testId);
}

function getSpeakingUploadsKey() {
  return "engmatch-speaking-uploads";
}

export function readStoredSpeakingUploads(): SpeakingAnyTest[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getSpeakingUploadsKey());
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as SpeakingAnyTest[];
  } catch {
    return [];
  }
}

export function writeStoredSpeakingUploads(tests: SpeakingAnyTest[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getSpeakingUploadsKey(), JSON.stringify(tests));
}

export function upsertStoredSpeakingUpload(test: SpeakingAnyTest) {
  const current = readStoredSpeakingUploads();
  const next = [...current.filter((item) => item.id !== test.id), test];
  writeStoredSpeakingUploads(next);
  return next;
}

export function getMergedSpeakingTests(mode: SpeakingMode) {
  const defaults = getSpeakingTestsByMode(mode);
  const custom = readStoredSpeakingUploads().filter((item) => item.mode === mode);
  return [...custom, ...defaults];
}
