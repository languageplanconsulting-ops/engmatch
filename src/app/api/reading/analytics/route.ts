import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    averageScore: 31,
    averageTimeMinutes: 52,
    strongestType: "summary-completion",
  });
}
