import { NextResponse } from "next/server";
import { getDbWritingPrompt } from "@/lib/db-content";
import { getWritingPrompt } from "@/lib/writing-demo";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/writing/prompts/[promptId]">,
) {
  const { promptId } = await context.params;
  const prompt = (await getDbWritingPrompt(promptId)) ?? getWritingPrompt(promptId);
  return NextResponse.json({
    item:
      prompt ?? {
        id: promptId,
        task: "task-2",
        title: `Prompt ${promptId}`,
      },
  });
}
