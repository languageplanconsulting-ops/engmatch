import { NextResponse } from "next/server";
import { getWritingPrompt } from "@/lib/writing-demo";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/writing/prompts/[promptId]">,
) {
  const { promptId } = await context.params;
  const prompt = getWritingPrompt(promptId);
  return NextResponse.json({
    item:
      prompt ?? {
        id: promptId,
        task: "task-2",
        title: `Prompt ${promptId}`,
      },
  });
}
