import { NextResponse } from "next/server";
import { writingPrompts } from "@/lib/writing-demo";

export async function GET() {
  return NextResponse.json({
    area: "admin-writing-prompts",
    items: writingPrompts,
  });
}
