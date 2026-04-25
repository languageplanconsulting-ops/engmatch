import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function SpeakingReportPage(props: Props) {
  const { id } = await props.params;
  const submission = await prisma.speakingSubmission.findUnique({ where: { id } });

  if (!submission) {
    return (
      <section className="stack-lg">
        <div className="status-banner">
          <strong>Report not found</strong>
          <p>This speaking submission does not exist.</p>
        </div>
      </section>
    );
  }

  const report = (submission.aiReport ?? {}) as Record<string, unknown>;
  const overall = report.overall && typeof report.overall === "object"
    ? (report.overall as Record<string, unknown>)
    : null;
  const roundedBand = Number(overall?.roundedBand ?? NaN);
  const feedbackSource = typeof report.feedbackSource === "string" ? report.feedbackSource : null;
  const feedbackModel = typeof report.feedbackModel === "string" ? report.feedbackModel : null;
  const fallbackReason = typeof report.fallbackReason === "string" ? report.fallbackReason : null;

  return (
    <section className="stack-lg">
      <nav className="breadcrumbs">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>
          <Link href="/speaking">Speaking</Link> /{" "}
        </span>
        <span>Report</span>
      </nav>

      <div className="section-header">
        <h2>Speaking Report</h2>
        <p>
          Status: <strong>{submission.status}</strong>
          {submission.status === "validated" && submission.validatedAt
            ? ` · validated at ${submission.validatedAt.toLocaleString()}`
            : " · pending admin validation"}
        </p>
      </div>

      <div className="list-card">
        <h3>Prompt</h3>
        <p>{submission.prompt}</p>
        <h3>Your Transcript</h3>
        <p>{submission.transcript}</p>
        {submission.audioUrl && (
          <>
            <h3>Your Recording</h3>
            <audio controls src={submission.audioUrl} style={{ width: "100%" }} />
          </>
        )}
      </div>

      <div className="list-card">
        <h3>AI Pre-generated Feedback</h3>
        <p>
          Overall band: <strong>{Number.isFinite(roundedBand) ? roundedBand.toFixed(1) : "N/A"}</strong>
        </p>
        {(feedbackSource || feedbackModel) && (
          <p>
            Provider: <strong>{feedbackSource ?? "unknown"}</strong>
            {feedbackModel ? ` (${feedbackModel})` : ""}
          </p>
        )}
        {report.errorCode === "fallback" && fallbackReason && (
          <p>
            Fallback reason: <strong>{fallbackReason}</strong>
          </p>
        )}
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {JSON.stringify(report, null, 2)}
        </pre>
      </div>
    </section>
  );
}
