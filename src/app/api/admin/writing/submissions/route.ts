import { NextResponse } from "next/server";
import { teacherInbox } from "@/lib/writing-demo";

export async function GET() {
  return NextResponse.json({
    area: "admin-writing-submissions",
    items: teacherInbox,
  });
}
