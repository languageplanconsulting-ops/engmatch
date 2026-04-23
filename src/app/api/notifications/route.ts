import { NextResponse } from "next/server";
import { notifications } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ items: notifications });
}
