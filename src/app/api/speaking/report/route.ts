import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    bandEstimate: 6.5,
    strengths: ["clear structure", "steady pace"],
    nextFocus: ["more examples", "less repetition"],
  });
}
