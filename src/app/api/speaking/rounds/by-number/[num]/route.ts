import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/speaking/rounds/by-number/[num]">,
) {
  const { num } = await context.params;
  return NextResponse.json({ id: num, title: `Round ${num}` });
}
