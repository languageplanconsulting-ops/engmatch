import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    attempts: [
      { id: "sat-1", topicId: "topic-1", bandEstimate: 6.5 },
      { id: "sat-2", topicId: "topic-2", bandEstimate: 7.0 },
    ],
  });
}
