import { NextResponse } from "next/server";
import { demoSets } from "@/lib/demo-data";
import { getDbReadingImports } from "@/lib/db-content";

export async function GET() {
  const imports = await getDbReadingImports();
  const importSummaries = imports.map((item) => ({
    id: item.test.id,
    title: item.test.title,
    level: item.test.level,
  }));

  return NextResponse.json({ items: [...demoSets.reading, ...importSummaries] });
}
