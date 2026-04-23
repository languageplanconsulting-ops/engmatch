import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/reading/attempts/[attemptId]">,
) {
  const { attemptId } = await context.params;
  return NextResponse.json({ attemptId, score: 31, reviewReady: true });
}
