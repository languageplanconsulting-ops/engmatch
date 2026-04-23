import { NextResponse } from "next/server";
import { getWritingSubmission } from "@/lib/writing-demo";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/writing/submissions/[submissionId]/ai-review">,
) {
  const { submissionId } = await context.params;
  const submission = getWritingSubmission(submissionId);

  return NextResponse.json({
    area: "admin-writing-ai-review",
    submissionId,
    summary:
      submission?.additionalComment ||
      "Preview-mode AI review placeholder with criterion-linked annotations.",
  });
}
