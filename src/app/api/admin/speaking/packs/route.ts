import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isSpeakingAnyTest,
  normalizeSpeakingPackRecord,
  type SpeakingAnyTest,
  type SpeakingMode,
} from "@/lib/speaking-demo";

type SpeakingPackRequest = {
  packs?: unknown;
};

function toResponseRecord(record: {
  packId: string;
  mode: string;
  name: string;
  topic: string;
  uploadedAt: Date;
  payload: unknown;
}) {
  return {
    packId: record.packId,
    mode: record.mode as SpeakingMode,
    name: record.name,
    topic: record.topic,
    uploadedAt: record.uploadedAt.toISOString().slice(0, 10),
    payload: record.payload as SpeakingAnyTest,
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
  const packs = rawPacks.filter(isSpeakingAnyTest);

  if (packs.length === 0) {
    return NextResponse.json({ error: "No valid speaking packs found." }, { status: 400 });
  }

  for (const pack of packs) {
    const normalized = normalizeSpeakingPackRecord(pack);
    await prisma.speakingPack.upsert({
      where: { packId: normalized.packId },
      update: {
        mode: normalized.mode,
        name: normalized.name,
        topic: normalized.topic,
        uploadedAt: new Date(normalized.uploadedAt),
        payload: normalized.payload,
      },
      create: {
        packId: normalized.packId,
        mode: normalized.mode,
        name: normalized.name,
        topic: normalized.topic,
        uploadedAt: new Date(normalized.uploadedAt),
        payload: normalized.payload,
      },
    });
  }

  const stored = await prisma.speakingPack.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    savedCount: packs.length,
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
