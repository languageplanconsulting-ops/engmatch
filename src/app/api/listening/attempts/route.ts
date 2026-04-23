import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    attempts: [
      { id: "lat-1", score: 31, setId: "ls-101" },
      { id: "lat-2", score: 34, setId: "ls-102" },
    ],
  });
}
