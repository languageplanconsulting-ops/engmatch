import { NextResponse } from "next/server";
import { getWritingSubmission } from "@/lib/writing-demo";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/writing/submissions/[submissionId]">,
) {
  const { submissionId } = await context.params;
  const submission = getWritingSubmission(submissionId);
  return NextResponse.json({
    item:
      submission ?? {
        id: submissionId,
        task: "task-2",
        status: "draft",
      },
  });
}
