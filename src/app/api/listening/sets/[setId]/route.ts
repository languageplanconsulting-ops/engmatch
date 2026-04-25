import { NextResponse } from "next/server";
import { demoSets } from "@/lib/demo-data";
import { getDbListeningSets } from "@/lib/db-content";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/listening/sets/[setId]">,
) {
  const { setId } = await context.params;
  const item = demoSets.listening.find((set) => set.id === setId);
  const remote = (await getDbListeningSets()).find((set) => set.id === setId);

  return NextResponse.json({
    item: remote ?? item ?? { id: setId, title: "Unknown listening set", level: "Preview" },
  });
}
