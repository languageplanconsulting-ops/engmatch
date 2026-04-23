import { NextResponse } from "next/server";
import { demoSets } from "@/lib/demo-data";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/reading/sets/[setId]">,
) {
  const { setId } = await context.params;
  const item = demoSets.reading.find((set) => set.id === setId);

  return NextResponse.json({
    item: item ?? { id: setId, title: "Unknown reading set", level: "Preview" },
  });
}
