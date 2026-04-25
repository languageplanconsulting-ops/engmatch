import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  accessHasAnyEnabledSkill,
  createAccessNotification,
  getSkillAccessFlags,
} from "@/lib/student-access";

const patchSchema = z.object({
  expiresAt: z.string().optional(),
  speaking: z.boolean().optional(),
  reading: z.boolean().optional(),
  listening: z.boolean().optional(),
  writing: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext<"/api/admin/student-access/[id]">) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid student access update." }, { status: 400 });
  }

  const existing = await prisma.studentAccessGrant.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Student access record not found." }, { status: 404 });
  }

  const access = getSkillAccessFlags({
    speaking: parsed.data.speaking ?? existing.speakingEnabled,
    reading: parsed.data.reading ?? existing.readingEnabled,
    listening: parsed.data.listening ?? existing.listeningEnabled,
    writing: parsed.data.writing ?? existing.writingEnabled,
  });

  if (!accessHasAnyEnabledSkill(access)) {
    return NextResponse.json({ error: "At least one app must remain enabled." }, { status: 400 });
  }

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : existing.expiresAt;
  if (Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Please provide a valid expiry date." }, { status: 400 });
  }

  const updated = await prisma.studentAccessGrant.update({
    where: { id },
    data: {
      expiresAt,
      speakingEnabled: access.speaking,
      readingEnabled: access.reading,
      listeningEnabled: access.listening,
      writingEnabled: access.writing,
    },
  });

  await createAccessNotification({
    accessId: updated.id,
    email: updated.email,
    expiresAt: updated.expiresAt,
    access,
  });

  return NextResponse.json({ item: updated });
}
