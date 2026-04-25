import { NextResponse } from "next/server";
import { getDbReadingImports } from "@/lib/db-content";

export async function GET() {
  const items = await getDbReadingImports();
  return NextResponse.json({ items });
}
