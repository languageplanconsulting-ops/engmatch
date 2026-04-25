import { NextResponse } from "next/server";
import { demoSets } from "@/lib/demo-data";
import { getDbListeningSets } from "@/lib/db-content";

export async function GET() {
  const items = await getDbListeningSets();
  return NextResponse.json({ items: items.length > 0 ? items : demoSets.listening });
}
