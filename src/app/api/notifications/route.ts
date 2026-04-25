import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionEmail } from "@/lib/student-access";

export async function GET() {
  const email = await getStudentSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const items = await prisma.studentNotification.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}
