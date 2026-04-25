import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeStudentEmail } from "@/lib/student-access";

const notificationSchema = z.object({
  email: z.string().email(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  category: z.string().trim().min(1).max(40).optional(),
});

export async function GET() {
  const items = await prisma.studentNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = notificationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid student email, title, and message." }, { status: 400 });
  }

  const email = normalizeStudentEmail(parsed.data.email);

  const notification = await prisma.studentNotification.create({
    data: {
      email,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category ?? "admin",
    },
  });

  return NextResponse.json({ item: notification });
}
