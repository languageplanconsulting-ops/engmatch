import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_: Request, ctx: Params) {
  const { id } = await ctx.params;
  const existing = await prisma.speakingSubmission.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const updated = await prisma.speakingSubmission.update({
    where: { id },
    data: {
      status: "validated",
      validatedAt: new Date(),
    },
  });

  return NextResponse.json({ item: updated });
}
