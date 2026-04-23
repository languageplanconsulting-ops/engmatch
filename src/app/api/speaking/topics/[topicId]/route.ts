import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/speaking/topics/[topicId]">,
) {
  const { topicId } = await context.params;
  return NextResponse.json({
    id: topicId,
    title: `Topic ${topicId}`,
    prompt: "Describe a useful piece of advice you received.",
  });
}
