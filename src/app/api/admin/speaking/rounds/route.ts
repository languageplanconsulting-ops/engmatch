import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    area: "admin-speaking-rounds",
    items: [
      { id: "round-1", label: "Starter fluency round" },
      { id: "round-2", label: "Cue card deep dive" },
    ],
  });
}
