import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  STUDENT_SESSION_COOKIE,
  hasStudentGrantExpired,
  normalizeStudentEmail,
  studentGrantToSkillAccess,
} from "@/lib/student-access";

const loginSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const email = normalizeStudentEmail(parsed.data.email);
  const grant = await prisma.studentAccessGrant.findUnique({
    where: { email },
  });

  if (!grant) {
    return NextResponse.json({ error: "This email does not have access yet. Please contact your admin." }, { status: 403 });
  }

  if (hasStudentGrantExpired(grant.expiresAt)) {
    return NextResponse.json({ error: "Your access has expired. Please ask your admin to extend it." }, { status: 403 });
  }

  const skillAccess = studentGrantToSkillAccess(grant);
  if (!Object.values(skillAccess).some(Boolean)) {
    return NextResponse.json({ error: "Your account is active, but no apps are enabled yet." }, { status: 403 });
  }

  const redirectPath =
    skillAccess.speaking ? "/speaking" :
    skillAccess.reading ? "/reading" :
    skillAccess.listening ? "/listening" :
    "/writing";

  const cookieStore = await cookies();
  cookieStore.set(STUDENT_SESSION_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: grant.expiresAt,
  });

  return NextResponse.json({
    ok: true,
    student: {
      email: grant.email,
      expiresAt: grant.expiresAt,
      access: skillAccess,
    },
    redirectPath,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
