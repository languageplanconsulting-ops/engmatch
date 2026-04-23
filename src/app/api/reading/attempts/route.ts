import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    attempts: [
      { id: "rat-1", setId: "rs-201", score: 29 },
      { id: "rat-2", setId: "rs-202", score: 33 },
    ],
  });
}
