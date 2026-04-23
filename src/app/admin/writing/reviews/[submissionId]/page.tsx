import { notFound } from "next/navigation";
import { WritingReviewWorkspace } from "@/components/writing/writing-review-workspace";
import { getSubmissionPrompt, getWritingSubmission } from "@/lib/writing-demo";

export default async function AdminWritingReviewDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const submission = getWritingSubmission(submissionId);
  const prompt = getSubmissionPrompt(submissionId);

  if (!submission || !prompt) {
    notFound();
  }

  return <WritingReviewWorkspace prompt={prompt} submission={submission} />;
}
