import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    area: "admin-speaking-report-settings",
    model: "gemini-2.5-flash",
    promptStyle: "supportive examiner feedback",
  });
}
