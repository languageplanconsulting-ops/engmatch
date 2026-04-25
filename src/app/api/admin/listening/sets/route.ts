import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asJsonInput, isListeningSet, type ListeningSet } from "@/lib/db-content";

type ListeningSetRequest = {
  sets?: unknown;
};

const listeningSetRecord = (prisma as unknown as {
  listeningSetRecord: {
    findMany: (args: unknown) => Promise<Array<{ payload: unknown }>>;
    upsert: (args: unknown) => Promise<unknown>;
    deleteMany: (args: unknown) => Promise<unknown>;
  };
}).listeningSetRecord;

export async function GET() {
  const items = await listeningSetRecord.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    area: "admin-listening",
    items: items.map((item) => item.payload),
  });
}

export async function POST(request: Request) {
  let body: ListeningSetRequest;

  try {
    body = (await request.json()) as ListeningSetRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sets = Array.isArray(body.sets) ? body.sets.filter(isListeningSet) : [];
  if (sets.length === 0) {
    return NextResponse.json({ error: "No valid listening sets found." }, { status: 400 });
  }

  for (const item of sets) {
    await listeningSetRecord.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        level: item.level,
        payload: asJsonInput(item),
      },
      create: {
        id: item.id,
        title: item.title,
        level: item.level,
        payload: asJsonInput(item),
      },
    });
  }

  const items = await listeningSetRecord.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    savedCount: sets.length,
    items: items.map((item) => item.payload as ListeningSet),
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const setId = url.searchParams.get("setId");
  if (!setId) {
    return NextResponse.json({ error: "setId is required." }, { status: 400 });
  }

  await listeningSetRecord.deleteMany({
    where: { id: setId },
  });

  return NextResponse.json({ ok: true, setId });
}
