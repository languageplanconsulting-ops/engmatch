import { NextResponse } from "next/server";
import { writingSubmissions } from "@/lib/writing-demo";

export async function GET() {
  return NextResponse.json({
    items: writingSubmissions,
  });
}
