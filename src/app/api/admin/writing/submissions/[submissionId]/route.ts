import { NextResponse } from "next/server";
import { getWritingSubmission } from "@/lib/writing-demo";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/writing/submissions/[submissionId]">,
) {
  const { submissionId } = await context.params;
  const submission = getWritingSubmission(submissionId);

  return NextResponse.json({
    area: "admin-writing-submission-detail",
    submission: submission ?? null,
  });
}
