import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmissionPrompt, getWritingSubmission } from "@/lib/writing-demo";

export default async function WritingSubmissionPage(
  props: PageProps<"/writing/submissions/[submissionId]">,
) {
  const { submissionId } = await props.params;
  const submission = getWritingSubmission(submissionId);
  const prompt = getSubmissionPrompt(submissionId);

  if (!submission || !prompt) {
    notFound();
  }

  return (
    <section className="stack-lg">
      <div className="section-header">
        <h2>{submission.studentName}&apos;s submission</h2>
        <p>
          Track the script status, the linked prompt, and whether teacher feedback has
          already been returned to the student.
        </p>
      </div>

      <article className="panel-shell">
        <div className="prompt-info-grid">
          <div className="info-tile">
            <span>Prompt</span>
            <strong>{prompt.title}</strong>
          </div>
          <div className="info-tile">
            <span>Status</span>
            <strong>{submission.status}</strong>
          </div>
          <div className="info-tile">
            <span>Submitted</span>
            <strong>{submission.submittedAt}</strong>
          </div>
          <div className="info-tile">
            <span>Teacher</span>
            <strong>{submission.teacherName}</strong>
          </div>
        </div>
        <div className="workspace-actions">
          <Link className="action-button action-button-primary" href={`/writing/submissions/${submissionId}/report`}>
            Open marked report
          </Link>
          <Link className="action-button" href={`/admin/writing/reviews/${submissionId}`}>
            Open teacher workspace
          </Link>
        </div>
      </article>
    </section>
  );
}
