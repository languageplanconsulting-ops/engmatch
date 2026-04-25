import { NextResponse } from "next/server";
import { writingPrompts } from "@/lib/writing-demo";
import { getDbWritingPrompts } from "@/lib/db-content";

export async function GET() {
  const items = await getDbWritingPrompts();
  return NextResponse.json({ items: items.length > 0 ? items : writingPrompts });
}
