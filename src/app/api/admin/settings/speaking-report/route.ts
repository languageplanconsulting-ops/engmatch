import { NextResponse } from "next/server";
import { runSpeakingSystemHealth } from "@/lib/speaking-admin-health";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("systemHealth") === "1") {
    const body = await runSpeakingSystemHealth();
    return NextResponse.json(body);
  }

  return NextResponse.json({
    area: "admin-speaking-report-settings",
    model: "gemini-2.5-flash",
    promptStyle: "supportive examiner feedback",
  });
}
