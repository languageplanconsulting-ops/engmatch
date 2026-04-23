import { notFound } from "next/navigation";
import { WritingReportView } from "@/components/writing/writing-report-view";
import { getSubmissionPrompt, getWritingSubmission } from "@/lib/writing-demo";

export default async function WritingSubmissionReportPage(
  props: PageProps<"/writing/submissions/[submissionId]/report">,
) {
  const { submissionId } = await props.params;
  const submission = getWritingSubmission(submissionId);
  const prompt = getSubmissionPrompt(submissionId);

  if (!submission || !prompt) {
    notFound();
  }

  return (
    <WritingReportView prompt={prompt} submission={submission} />
  );
}
