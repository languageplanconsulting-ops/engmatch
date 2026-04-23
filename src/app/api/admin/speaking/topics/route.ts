import { NextResponse } from "next/server";
import { demoSets } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({
    area: "admin-speaking-topics",
    items: demoSets.speaking,
  });
}
