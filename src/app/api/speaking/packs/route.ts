import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SpeakingAnyTest, SpeakingMode } from "@/lib/speaking-demo";

export async function GET() {
  const packs = await prisma.speakingPack.findMany({
    orderBy: { uploadedAt: "desc" },
  });
  const attempts = await prisma.speakingAttempt.findMany({
    orderBy: { createdAt: "desc" },
    select: { packId: true, bestBand: true },
  });
  const bandByPack = new Map<string, number>();
  for (const attempt of attempts) {
    if (typeof attempt.bestBand !== "number") continue;
    if (!bandByPack.has(attempt.packId)) {
      bandByPack.set(attempt.packId, attempt.bestBand);
    }
  }

  return NextResponse.json({
    items: packs.map((record) => ({
      packId: record.packId,
      mode: record.mode as SpeakingMode,
      part: record.part,
      name: record.name,
      topic: record.topic,
      questionCount: record.questionCount,
      lastBand: bandByPack.get(record.packId) ?? 0,
      redeemLabel: (bandByPack.get(record.packId) ?? 0) < 9 ? "Redeem" : null,
      uploadedAt: record.uploadedAt.toISOString().slice(0, 10),
      payload: record.payload as SpeakingAnyTest,
    })),
  });
}
