import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  accessHasAnyEnabledSkill,
  createAccessNotification,
  defaultAccessExpiryDate,
  getSkillAccessFlags,
  normalizeStudentEmail,
} from "@/lib/student-access";

const accessSchema = z.object({
  email: z.string().email(),
  expiresAt: z.string().optional(),
  access: z.object({
    speaking: z.boolean().optional(),
    reading: z.boolean().optional(),
    listening: z.boolean().optional(),
    writing: z.boolean().optional(),
  }).optional(),
});

export async function GET() {
  const items = await prisma.studentAccessGrant.findMany({
    orderBy: [{ updatedAt: "desc" }, { email: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = accessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid student email and access settings." }, { status: 400 });
  }

  const email = normalizeStudentEmail(parsed.data.email);
  const access = getSkillAccessFlags(parsed.data.access ?? {});

  if (!accessHasAnyEnabledSkill(access)) {
    return NextResponse.json({ error: "Enable at least one app before saving access." }, { status: 400 });
  }

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : defaultAccessExpiryDate();
  if (Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Please provide a valid expiry date." }, { status: 400 });
  }

  const saved = await prisma.studentAccessGrant.upsert({
    where: { email },
    update: {
      expiresAt,
      speakingEnabled: access.speaking,
      readingEnabled: access.reading,
      listeningEnabled: access.listening,
      writingEnabled: access.writing,
    },
    create: {
      email,
      expiresAt,
      speakingEnabled: access.speaking,
      readingEnabled: access.reading,
      listeningEnabled: access.listening,
      writingEnabled: access.writing,
    },
  });

  await createAccessNotification({
    accessId: saved.id,
    email: saved.email,
    expiresAt: saved.expiresAt,
    access,
  });

  return NextResponse.json({ item: saved });
}
