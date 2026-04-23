import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    rounds: [
      { id: "1", title: "Starter round" },
      { id: "2", title: "Extended round" },
    ],
  });
}
