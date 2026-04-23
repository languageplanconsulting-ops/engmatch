"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  readWritingReviewDraft,
  writingFeedbackMeta,
  type WritingFeedbackCategory,
  type WritingPrompt,
  type WritingSubmission,
} from "@/lib/writing-demo";
type Props = {
  prompt: WritingPrompt;
  submission: WritingSubmission;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render paragraph text with inline category highlights for annotated phrases. */
function renderParagraphWithHighlights(
  text: string,
  annotations: WritingSubmission["annotations"],
): React.ReactNode {
  const sorted = [...annotations].sort(
    (a, b) => text.indexOf(a.selectedText) - text.indexOf(b.selectedText),
  );

  const parts: React.ReactNode[] = [];
  let pos = 0;

  for (const ann of sorted) {
    const idx = text.indexOf(ann.selectedText, pos);
    if (idx === -1) continue;

    if (idx > pos) parts.push(<span key={`t-${pos}`}>{text.slice(pos, idx)}</span>);

    const meta = writingFeedbackMeta[ann.category as WritingFeedbackCategory];
    const seqNum = ((ann as { sortOrder?: number }).sortOrder ?? 0) + 1;
    const shortRaw =
      (ann as { inlineComment?: string }).inlineComment ??
      (ann as { comment?: string }).comment ??
      "";
    const shortLine = shortRaw.replace(/\s+/g, " ").trim() || "???";
    parts.push(
      <span key={`m-${ann.id}`} className="pdf-ann-anchor">
        <span className="pdf-ann-bubble" style={{ color: meta.color }}>
          <span className="pdf-ann-bubble-short">
            [{seqNum}] {shortLine}
          </span>
        </span>
        <mark
          className="pdf-inline-mark"
          style={
            {
              "--pdf-ann-soft": meta.soft,
              borderBottomColor: meta.color,
            } as React.CSSProperties
          }
        >
          {ann.selectedText}
        </mark>
        <sup className="pdf-ann-sup" style={{ color: meta.color }}>[{seqNum}]</sup>
      </span>,
    );
    pos = idx + ann.selectedText.length;
  }

  if (pos < text.length) parts.push(<span key="t-end">{text.slice(pos)}</span>);
  return parts;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WritingReportView({ prompt, submission }: Props) {
  const draft = readWritingReviewDraft(submission.id);
  const reportScores = draft?.scores ?? submission.scores;
  const reportComment = draft?.comment ?? submission.additionalComment;
  const reportSent = draft?.reviewSent ?? submission.status === "reviewed";
  const reportAnnotations =
    draft?.annotations.map((annotation, index) => ({
      id: `draft-${annotation.id}`,
      category: annotation.category,
      paragraphIndex: rawTextToParagraphIndex(submission.response, annotation.start),
      scope: "phrase" as const,
      selectedText: submission.response.slice(annotation.start, annotation.end),
      inlineComment: annotation.inlineComment,
      detailComment: annotation.detailComment,
      comment: annotation.detailComment || annotation.inlineComment,
      sortOrder: index,
    })) ??
    submission.annotations.map((annotation, index) => ({
      ...annotation,
      inlineComment: "",
      detailComment: annotation.comment,
      sortOrder: index,
    }));
  const paragraphs = useMemo(() => submission.response.split("\n\n"), [submission.response]);
  const hasAnnotations = reportAnnotations.length > 0;

  return (
    <div className="pdf-wrapper">
      {/* ── Screen-only bar (hidden on print) ── */}
      <div className="pdf-screen-bar">
        <div>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <span><Link href="/">Home</Link> / </span>
            <span><Link href="/admin/writing/reviews">Inbox</Link> / </span>
            <span>Student report</span>
          </nav>
          <h2 style={{ margin: "6px 0 0", fontSize: "1.1rem", fontWeight: 800 }}>
            {submission.studentName} — {prompt.title}
          </h2>
          <p className="pdf-screen-status">
            {reportSent ? "Report reflects the latest teacher review." : "Draft report preview."}
          </p>
        </div>
        <div className="pdf-screen-actions">
          <Link
            className="pdf-back-link"
            href={`/admin/writing/reviews/${submission.id}`}
          >
            ← Back to review
          </Link>
          <button
            type="button"
            className="pdf-export-btn"
            onClick={() => window.print()}
          >
            Export to PDF
          </button>
        </div>
      </div>

      {/* ── The report (rendered on screen + in print) ── */}
      <article className="pdf-report">
        {/* Header */}
        <header className="pdf-header">
          <div className="pdf-brand">
            <span className="pdf-brand-name">English Plan</span>
            <span className="pdf-brand-sub">IELTS Academic Writing</span>
          </div>
          <div className="pdf-header-right">
            <span className="pdf-report-label">Feedback Report</span>
            <span className="pdf-task-badge">{prompt.task.toUpperCase()}</span>
          </div>
        </header>

        {/* Student / teacher info */}
        <div className="pdf-info-bar">
          <div className="pdf-info-cell">
            <span>Student</span>
            <strong>{submission.studentName}</strong>
          </div>
          <div className="pdf-info-cell">
            <span>Teacher</span>
            <strong>{submission.teacherName}</strong>
          </div>
          <div className="pdf-info-cell">
            <span>Submitted</span>
            <strong>{submission.submittedAt}</strong>
          </div>
          <div className="pdf-info-cell">
            <span>Reviewed</span>
            <strong>{submission.reviewedAt || "Pending"}</strong>
          </div>
        </div>

        {/* Prompt title */}
        <div className="pdf-prompt-bar">
          <p className="pdf-prompt-label">Prompt</p>
          <p className="pdf-prompt-title">{prompt.title}</p>
        </div>

        {/* Band scores */}
        <section className="pdf-scores-section">
          <h3 className="pdf-scores-heading">Band Scores</h3>
          <div className="pdf-scores-grid">
            {(["grammar", "vocabulary", "coherence", "taskAchievement"] as WritingFeedbackCategory[]).map(
              (cat) => {
                const meta = writingFeedbackMeta[cat];
                const val = reportScores[cat];
                return (
                  <div
                    key={cat}
                    className="pdf-score-cell"
                    style={{ borderColor: meta.color, borderLeftWidth: 5 }}
                  >
                    <span>{meta.label}</span>
                    <strong style={{ color: meta.color }}>{val.toFixed(1)}</strong>
                  </div>
                );
              },
            )}
            <div className="pdf-score-cell pdf-score-overall" style={{ borderColor: "#111" }}>
              <span>Overall Band</span>
              <strong>
                {(
                  Math.round(
                    (Object.values(reportScores).reduce((sum, value) => sum + value, 0) /
                      Object.values(reportScores).length) *
                      2,
                  ) / 2
                ).toFixed(1)}
              </strong>
            </div>
          </div>
        </section>

        {/* Teacher summary */}
        {reportComment && (
          <section className="pdf-summary-section">
            <h3 className="pdf-summary-heading">Teacher&apos;s Comment</h3>
            <p className="pdf-summary-text">{reportComment}</p>
          </section>
        )}

        {/* Essay with inline annotations */}
        <section className="pdf-essay-section">
          <h3 className="pdf-essay-heading">Your Essay</h3>

          {/* Colour legend */}
          {hasAnnotations && (
            <div className="pdf-legend">
              <span className="pdf-legend-title">Feedback key</span>
              {(["grammar", "vocabulary", "coherence", "taskAchievement"] as WritingFeedbackCategory[]).map(
                (cat) => {
                  const meta = writingFeedbackMeta[cat];
                  const hasAny = reportAnnotations.some((a) => a.category === cat);
                  if (!hasAny) return null;
                  return (
                    <span key={cat} className="pdf-legend-item">
                      <span
                        className="pdf-legend-dot"
                        style={{ background: meta.soft, borderColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                  );
                },
              )}
            </div>
          )}

          {/* Paragraphs */}
          {paragraphs.map((para, i) => {
            const paraAnnotations = reportAnnotations.filter(
              (a) => a.paragraphIndex === i,
            );
            return (
              <div key={i} className="pdf-essay-block">
                <p className="pdf-para-num">Paragraph {i + 1}</p>
                <p className="pdf-para-text">
                  {paraAnnotations.length > 0
                    ? renderParagraphWithHighlights(para, paraAnnotations)
                    : para}
                </p>

                {paraAnnotations.length > 0 && (
                  <div className="pdf-para-notes">
                    <p className="pdf-para-notes-heading">Live notes</p>
                    {paraAnnotations.map((ann) => {
                      const meta = writingFeedbackMeta[ann.category as WritingFeedbackCategory];
                      const seqNum = ((ann as { sortOrder?: number }).sortOrder ?? 0) + 1;
                      const inlineRaw = (ann as { inlineComment?: string }).inlineComment ?? "";
                      const shortTag = inlineRaw.replace(/\s+/g, " ").trim();
                      const explicitDetail =
                        (ann as { detailComment?: string }).detailComment?.trim() ?? "";
                      const teacherBody =
                        explicitDetail ||
                        (!shortTag && (ann.comment?.trim() || "")) ||
                        "";
                      return (
                        <div
                          key={ann.id}
                          className="pdf-note-card"
                          style={{ borderLeft: `6px solid ${meta.color}` }}
                        >
                          <div className="pdf-note-header">
                            <span
                              className="pdf-note-tag"
                              style={{
                                background: meta.soft,
                                color: meta.color,
                                borderColor: meta.color,
                              }}
                            >
                              #{seqNum} // {meta.label}
                            </span>
                          </div>
                          <span className="pdf-note-kicker">Selected text</span>
                          <p className="pdf-note-quote">&ldquo;{ann.selectedText}&rdquo;</p>
                          <span className="pdf-note-kicker">Short tag</span>
                          {shortTag ? (
                            <p className="pdf-note-short">[{seqNum}] {shortTag}</p>
                          ) : (
                            <p className="pdf-note-muted">No short tag</p>
                          )}
                          <span className="pdf-note-kicker">Teacher note</span>
                          {teacherBody ? (
                            <p className="pdf-note-comment">{teacherBody}</p>
                          ) : (
                            <p className="pdf-note-muted">No fuller note yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Footer */}
        <footer className="pdf-footer">
          <span>English Plan</span>
          <span>Confidential — For student use only</span>
        </footer>
      </article>
    </div>
  );
}

function rawTextToParagraphIndex(response: string, charIndex: number) {
  const paragraphs = response.split("\n\n");
  let offset = 0;

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    const paragraphEnd = offset + paragraph.length;
    if (charIndex <= paragraphEnd) {
      return index;
    }

    offset = paragraphEnd + 2;
  }

  return Math.max(0, paragraphs.length - 1);
}
