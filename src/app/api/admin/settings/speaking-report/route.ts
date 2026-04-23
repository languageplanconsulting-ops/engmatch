import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    area: "admin-speaking-report-settings",
    model: "preview-mode",
    promptStyle: "supportive examiner feedback",
  });
}
