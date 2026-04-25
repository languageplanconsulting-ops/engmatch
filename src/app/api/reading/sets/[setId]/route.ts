import { NextResponse } from "next/server";
import { demoSets } from "@/lib/demo-data";
import { getDbReadingImports } from "@/lib/db-content";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/reading/sets/[setId]">,
) {
  const { setId } = await context.params;
  const item = demoSets.reading.find((set) => set.id === setId);
  const imported = (await getDbReadingImports()).find((entry) => entry.test.id === setId || entry.id === setId);

  return NextResponse.json({
    item: item ?? (imported ? { id: imported.test.id, title: imported.test.title, level: imported.test.level } : { id: setId, title: "Unknown reading set", level: "Preview" }),
  });
}
