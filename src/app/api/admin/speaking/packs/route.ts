import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SpeakingMode } from "@/lib/speaking-demo";
import {
  getPackPart,
  getPackQuestionCount,
  speakingPackSchema,
  type SpeakingRebuildPack,
} from "@/lib/speaking-rebuild-schema";

type SpeakingPackRequest = {
  packs?: unknown;
};

function toResponseRecord(record: {
  packId: string;
  mode: string;
  part: string;
  name: string;
  topic: string;
  questionCount: number;
  uploadedAt: Date;
  payload: unknown;
}) {
  return {
    packId: record.packId,
    mode: record.mode as SpeakingMode,
    part: record.part,
    name: record.name,
    topic: record.topic,
    questionCount: record.questionCount,
    uploadedAt: record.uploadedAt.toISOString().slice(0, 10),
    payload: record.payload as SpeakingRebuildPack,
  };
}

export async function GET() {
  const packs = await prisma.speakingPack.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    items: packs.map(toResponseRecord),
  });
}

export async function POST(req: Request) {
  let body: SpeakingPackRequest;

  try {
    body = (await req.json()) as SpeakingPackRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawPacks = Array.isArray(body.packs) ? body.packs : [];
  const parsedPacks: SpeakingRebuildPack[] = [];
  for (const candidate of rawPacks) {
    const parsed = speakingPackSchema.safeParse(candidate);
    if (parsed.success) {
      parsedPacks.push(parsed.data);
    }
  }

  if (parsedPacks.length === 0) {
    return NextResponse.json(
      { error: "No valid speaking packs found. Part 1/3 require 4-6 questions; Part 2 requires exactly one question." },
      { status: 400 },
    );
  }

  for (const pack of parsedPacks) {
    await prisma.speakingPack.upsert({
      where: { packId: pack.id },
      update: {
        mode: pack.mode,
        part: getPackPart(pack),
        name: pack.name,
        topic: pack.topic,
        questionCount: getPackQuestionCount(pack),
        uploadedAt: new Date(pack.uploadedAt),
        payload: pack,
      },
      create: {
        packId: pack.id,
        mode: pack.mode,
        part: getPackPart(pack),
        name: pack.name,
        topic: pack.topic,
        questionCount: getPackQuestionCount(pack),
        uploadedAt: new Date(pack.uploadedAt),
        payload: pack,
      },
    });
  }

  const stored = await prisma.speakingPack.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    savedCount: parsedPacks.length,
    items: stored.map(toResponseRecord),
  });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const packId = url.searchParams.get("packId");

  if (!packId) {
    return NextResponse.json({ error: "packId is required." }, { status: 400 });
  }

  await prisma.speakingPack.deleteMany({
    where: { packId },
  });

  return NextResponse.json({ ok: true, packId });
}
