import { z } from "zod";

const speakingQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  ttsText: z.string().min(1),
  ttsAudioUrl: z.string().optional(),
  mockTranscript: z.string().optional().default(""),
});

const providerSchema = z.object({
  thumbnailName: z.string().optional().default(""),
  ttsAssetName: z.string().optional().default(""),
  ttsVoice: z.string().optional().default("aura-asteria-en"),
  transcriptionProvider: z.literal("deepgram").optional().default("deepgram"),
  transcriptionModel: z.string().optional().default("nova-3"),
  language: z.string().optional().default("en-US"),
});

export const speakingPart13PackSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(["part-1", "part-3"]),
  name: z.string().min(1),
  uploadedAt: z.string().min(1),
  topic: z.string().min(1),
  provider: providerSchema,
  tips: z.array(
    z.object({
      type: z.enum(["grammar", "vocabulary", "pattern"]),
      title: z.string().min(1),
      body: z.string().min(1),
      examples: z.array(z.string()).optional(),
    }),
  ).optional(),
  questions: z.array(speakingQuestionSchema).min(4).max(6),
});

export const speakingPart2PackSchema = z.object({
  id: z.string().min(1),
  mode: z.literal("part-2"),
  name: z.string().min(1),
  uploadedAt: z.string().min(1),
  topic: z.string().min(1),
  provider: providerSchema,
  preparationOptions: z.array(z.number()).optional().default([1]),
  question: speakingQuestionSchema,
});

export const speakingPackSchema = z.union([
  speakingPart13PackSchema,
  speakingPart2PackSchema,
]);

export type SpeakingRebuildPack = z.infer<typeof speakingPackSchema>;

export function getPackPart(pack: SpeakingRebuildPack) {
  return pack.mode;
}

export function getPackQuestionCount(pack: SpeakingRebuildPack) {
  return "questions" in pack ? pack.questions.length : 1;
}
