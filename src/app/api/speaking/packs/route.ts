import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SpeakingAnyTest, SpeakingMode } from "@/lib/speaking-demo";

export async function GET() {
  const packs = await prisma.speakingPack.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    items: packs.map((record) => ({
      packId: record.packId,
      mode: record.mode as SpeakingMode,
      name: record.name,
      topic: record.topic,
      uploadedAt: record.uploadedAt.toISOString().slice(0, 10),
      payload: record.payload as SpeakingAnyTest,
    })),
  });
}
