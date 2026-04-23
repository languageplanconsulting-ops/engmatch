import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    words: ["orientation", "scholarship", "enrolment"],
  });
}
