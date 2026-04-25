import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ReadingImportedTestPackage } from "@/lib/reading-demo";
import type { WritingPrompt } from "@/lib/writing-demo";

export type ListeningSet = {
  id: string;
  title: string;
  level: string;
  description?: string;
  transcript?: string;
  audioUrl?: string;
  questions?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asJsonInput(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function getDbReadingImports() {
  const items = await prisma.readingImportPackage.findMany({
    orderBy: { importedAt: "desc" },
  });

  return items.map((item) => item.payload as unknown as ReadingImportedTestPackage);
}

export async function getDbListeningSets() {
  const items = await prisma.listeningSetRecord.findMany({
    orderBy: { createdAt: "desc" },
  });

  return items.map((item) => item.payload as unknown as ListeningSet);
}

export async function getDbWritingPrompts() {
  const items = await prisma.writingPromptRecord.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return items.map((item) => item.payload as unknown as WritingPrompt);
}

export async function getDbWritingPrompt(promptId: string) {
  const item = await prisma.writingPromptRecord.findUnique({
    where: { id: promptId },
  });

  return item?.payload as WritingPrompt | undefined;
}

export function isListeningSet(value: unknown): value is ListeningSet {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.level === "string"
  );
}

export function isWritingPrompt(value: unknown): value is WritingPrompt {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.task === "task-1" || value.task === "task-2") &&
    typeof value.testName === "string" &&
    typeof value.topic === "string" &&
    typeof value.title === "string" &&
    typeof value.uploadedAt === "string" &&
    typeof value.duration === "string" &&
    typeof value.recommendedWords === "string" &&
    typeof value.summary === "string" &&
    typeof value.promptText === "string" &&
    typeof value.teacherUploadNote === "string" &&
    Array.isArray(value.instructions)
  );
}
