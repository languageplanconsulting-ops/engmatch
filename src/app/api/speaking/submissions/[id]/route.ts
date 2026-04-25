import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Params) {
  const { id } = await ctx.params;
  const item = await prisma.speakingSubmission.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  return NextResponse.json({ item });
}
