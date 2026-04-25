import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asJsonInput, isWritingPrompt } from "@/lib/db-content";

export async function GET() {
  const items = await prisma.writingPromptRecord.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    area: "admin-writing-prompts",
    items: items.map((item) => item.payload),
  });
}

export async function POST(request: Request) {
  let body: { prompts?: unknown };

  try {
    body = (await request.json()) as { prompts?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompts = Array.isArray(body.prompts) ? body.prompts.filter(isWritingPrompt) : [];
  if (prompts.length === 0) {
    return NextResponse.json({ error: "No valid writing prompts found." }, { status: 400 });
  }

  for (const prompt of prompts) {
    await prisma.writingPromptRecord.upsert({
      where: { id: prompt.id },
      update: {
        task: prompt.task,
        title: prompt.title,
        uploadedAt: new Date(prompt.uploadedAt),
        payload: asJsonInput(prompt),
      },
      create: {
        id: prompt.id,
        task: prompt.task,
        title: prompt.title,
        uploadedAt: new Date(prompt.uploadedAt),
        payload: asJsonInput(prompt),
      },
    });
  }

  const items = await prisma.writingPromptRecord.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({
    savedCount: prompts.length,
    items: items.map((item) => item.payload),
  });
}
