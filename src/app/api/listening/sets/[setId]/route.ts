import { NextResponse } from "next/server";
import { demoSets } from "@/lib/demo-data";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/listening/sets/[setId]">,
) {
  const { setId } = await context.params;
  const item = demoSets.listening.find((set) => set.id === setId);

  return NextResponse.json({
    item: item ?? { id: setId, title: "Unknown listening set", level: "Preview" },
  });
}
