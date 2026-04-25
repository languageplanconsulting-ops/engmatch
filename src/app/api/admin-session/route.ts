import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_ACCESS_CODE, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

const adminLoginSchema = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = adminLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter the admin access code." }, { status: 400 });
  }

  if (parsed.data.code !== ADMIN_ACCESS_CODE) {
    return NextResponse.json({ error: "Incorrect admin code." }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({
    ok: true,
    redirectPath: "/admin",
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
