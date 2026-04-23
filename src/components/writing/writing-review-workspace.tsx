"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  readWritingReviewDraft,
  writeWritingReviewDraft,
  writingFeedbackMeta,
  type StoredInlineAnnotation,
  type WritingFeedbackCategory,
  type WritingPrompt,
  type WritingSubmission,
} from "@/lib/writing-demo";
import {
  LIVE_NOTE_DICTATION_LABELS,
  type DictationLanguage,
  useLiveNoteDictation,
} from "@/components/writing/use-live-note-dictation";
type Props = {
  prompt: WritingPrompt;
  submission: WritingSubmission;
};

type InlineAnnotation = StoredInlineAnnotation;

type ToolbarState = {
  show: boolean;
  top: number;
  left: number;
  start: number;
  end: number;
};

type ResolvedBoundary = {
  container: Node;
  offset: number;
};

const FEEDBACK_ORDER: WritingFeedbackCategory[] = [
  "grammar",
  "vocabulary",
  "coherence",
  "taskAchievement",
];
const OVERALL_COMMENT_DICTATION_ID = -1;

function shortenText(text: string, limit = 52) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trimEnd()}…`;
}

function buildInitialAnnotations(
  response: string,
  submission: WritingSubmission,
): InlineAnnotation[] {
  const paragraphs = response.split("\n\n");
  return submission.annotations.map((annotation, index) => {
    const paragraphOffset = paragraphs
      .slice(0, annotation.paragraphIndex)
      .reduce((total, paragraph) => total + paragraph.length + 2, 0);
    const paragraphText = paragraphs[annotation.paragraphIndex] ?? "";
    const relativeStart = Math.max(paragraphText.indexOf(annotation.selectedText), 0);

    return {
      id: index + 1,
      start: paragraphOffset + relativeStart,
      end: paragraphOffset + relativeStart + annotation.selectedText.length,
      category: annotation.category,
      inlineComment: annotation.comment,
      detailComment: annotation.comment,
    };
  });
}

export function WritingReviewWorkspace({ prompt, submission }: Props) {
  const rawText = submission.response;
  const editorRef = useRef<HTMLDivElement>(null);
  const annsScrollRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const detailRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const skipInlineBlurRef = useRef(false);
  const initialAnnotations = useMemo(
    () => buildInitialAnnotations(rawText, submission),
    [rawText, submission],
  );
  const initialDraft = useMemo(
    () => readWritingReviewDraft(submission.id),
    [submission.id],
  );
  const nextId = useRef(
    (initialDraft?.annotations.at(-1)?.id ?? initialAnnotations.at(-1)?.id ?? 0) + 1,
  );

  const [annotations, setAnnotations] = useState<InlineAnnotation[]>(
    () => initialDraft?.annotations ?? initialAnnotations,
  );
  const [toolbar, setToolbar] = useState<ToolbarState>({
    show: false,
    top: 0,
    left: 0,
    start: 0,
    end: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailFocusId, setDetailFocusId] = useState<number | null>(null);
  const [newestId, setNewestId] = useState<number | null>(null);
  const [scores, setScores] = useState(initialDraft?.scores ?? submission.scores);
  const [comment, setComment] = useState(
    initialDraft?.comment ??
      submission.additionalComment ??
      "Your ideas are well-structured. Focus next on tightening your examples and sharpening the academic register throughout.",
  );
  const [reviewSent, setReviewSent] = useState(
    initialDraft?.reviewSent ?? submission.status === "reviewed",
  );
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const updateDetailAnnotation = useCallback((id: number, detailComment: string) => {
    setAnnotations((previous) =>
      previous.map((annotation) =>
        annotation.id === id ? { ...annotation, detailComment } : annotation,
      ),
    );
  }, []);
  const dictation = useLiveNoteDictation((id, nextText) => {
    if (id === OVERALL_COMMENT_DICTATION_ID) {
      setComment(nextText);
      return;
    }
    updateDetailAnnotation(id, nextText);
  });

  const totalScore = useMemo(() => {
    const values = Object.values(scores);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(avg * 2) / 2;
  }, [scores]);

  // ── Offset calculation ─────────────────────────────────────────────────────

  function getAbsoluteOffset(container: Node, offset: number): number {
    let total = 0;
    const walker = document.createTreeWalker(editorRef.current!, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest(".comment-bubble")) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(".tr-ann-num")) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(".tr-ann-bubble")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      if (node === container) {
        total += offset;
        break;
      }
      total += node.textContent?.length ?? 0;
      node = walker.nextNode();
    }

    return total;
  }

  function resolveBoundary(container: Node, offset: number): ResolvedBoundary {
    if (container.nodeType === Node.TEXT_NODE) {
      return { container, offset };
    }

    const element = container as Element;
    const childAtOffset = element.childNodes.item(offset) ?? null;
    const previousChild = offset > 0 ? element.childNodes.item(offset - 1) : null;

    if (childAtOffset) {
      const walker = document.createTreeWalker(childAtOffset, NodeFilter.SHOW_TEXT);
      const firstText = walker.nextNode();
      if (firstText) {
        return { container: firstText, offset: 0 };
      }
    }

    if (previousChild) {
      const walker = document.createTreeWalker(previousChild, NodeFilter.SHOW_TEXT);
      let lastText: Node | null = null;
      let next = walker.nextNode();
      while (next) {
        lastText = next;
        next = walker.nextNode();
      }
      if (lastText?.nodeType === Node.TEXT_NODE) {
        return {
          container: lastText,
          offset: lastText.textContent?.length ?? 0,
        };
      }
    }

    return { container, offset };
  }

  // ── Focus effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (editingId === null) return;
    inputRefs.current[editingId]?.focus();
  }, [editingId]);

  useEffect(() => {
    if (detailFocusId === null) return;
    detailRefs.current[detailFocusId]?.focus();
  }, [detailFocusId]);

  // ── Selection handler ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleMouseUp = () => {
      if (editingId !== null) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setToolbar((current) => ({ ...current, show: false }));
        return;
      }

      const range = selection.getRangeAt(0);
      if (!editorRef.current?.contains(range.commonAncestorContainer)) {
        setToolbar((current) => ({ ...current, show: false }));
        return;
      }

      const startBoundary = resolveBoundary(range.startContainer, range.startOffset);
      const endBoundary = resolveBoundary(range.endContainer, range.endOffset);
      const start = getAbsoluteOffset(startBoundary.container, startBoundary.offset);
      const end = getAbsoluteOffset(endBoundary.container, endBoundary.offset);
      if (start === end) {
        setToolbar((current) => ({ ...current, show: false }));
        return;
      }

      const overlaps = annotations.some(
        (annotation) =>
          (start >= annotation.start && start < annotation.end) ||
          (end > annotation.start && end <= annotation.end) ||
          (start <= annotation.start && end >= annotation.end),
      );
      if (overlaps) {
        setToolbar((current) => ({ ...current, show: false }));
        return;
      }

      const rect = range.getBoundingClientRect();
      setToolbar({
        show: true,
        top: Math.max(8, rect.top - 54),
        left: rect.left + rect.width / 2,
        start,
        end,
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [annotations, editingId]);

  // ── Persist draft ──────────────────────────────────────────────────────────

  useEffect(() => {
    writeWritingReviewDraft(submission.id, {
      annotations,
      scores,
      comment,
      reviewSent,
    });
  }, [annotations, comment, reviewSent, scores, submission.id]);

  // ── Auto-scroll sidebar to new card ───────────────────────────────────────

  useEffect(() => {
    if (newestId === null) return;
    const el = annsScrollRef.current?.querySelector(`[data-ann-id="${newestId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [newestId]);

  // ── Add / update / delete ──────────────────────────────────────────────────

  function addAnnotation(category: WritingFeedbackCategory) {
    const id = nextId.current++;
    setAnnotations((previous) =>
      [
        ...previous,
        {
          id,
          start: toolbar.start,
          end: toolbar.end,
          category,
          inlineComment: "",
          detailComment: "",
        },
      ].sort((a, b) => a.start - b.start),
    );
    setToolbar({ show: false, top: 0, left: 0, start: 0, end: 0 });
    window.getSelection()?.removeAllRanges();
    setNewestId(id);
    setEditingId(id);
  }

  function updateInlineAnnotation(id: number, inlineComment: string) {
    setAnnotations((previous) =>
      previous.map((annotation) =>
        annotation.id === id ? { ...annotation, inlineComment } : annotation,
      ),
    );
  }

  function deleteAnnotation(id: number) {
    setAnnotations((previous) => previous.filter((annotation) => annotation.id !== id));
    if (editingId === id) setEditingId(null);
    if (detailFocusId === id) setDetailFocusId(null);
  }

  function transitionToDetail(id: number) {
    skipInlineBlurRef.current = true;
    setEditingId(null);
    setDetailFocusId(id);
    requestAnimationFrame(() => {
      skipInlineBlurRef.current = false;
    });
  }

  function finishEditing(id: number) {
    if (skipInlineBlurRef.current) {
      return;
    }
    const annotation = annotations.find((item) => item.id === id);
    if (!annotation) {
      setEditingId(null);
      return;
    }

    if (!annotation.inlineComment.trim()) {
      deleteAnnotation(id);
      return;
    }

    setEditingId(null);
    setDetailFocusId(id);
  }

  function handleStartDetailDictation(
    annotationId: number,
    lang: DictationLanguage,
    seedText: string,
  ) {
    setDetailFocusId(annotationId);
    detailRefs.current[annotationId]?.focus();
    dictation.startDictation(annotationId, lang, seedText);
  }

  function handleStartOverallDictation(lang: DictationLanguage) {
    dictation.startDictation(OVERALL_COMMENT_DICTATION_ID, lang, comment);
  }

  function focusAnnotationMark(annotationId: number) {
    setActiveNoteId(annotationId);
    const anchor = editorRef.current?.querySelector(`[data-ann-anchor-id="${annotationId}"]`);
    if (anchor instanceof HTMLElement) {
      anchor.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => anchor.focus(), 120);
    }
  }

  // ── Render essay (paragraph-based so \n\n doesn't create giant spacing) ───

  function renderEssay() {
    const paragraphs = rawText.split("\n\n");
    const annIndexMap = new Map(annotations.map((a, i) => [a.id, i]));
    let paraOffset = 0;

    return paragraphs.map((para, paraIdx) => {
      const paraStart = paraOffset;
      paraOffset += para.length + 2; // +2 for the \n\n separator

      const paraAnns = annotations.filter(
        (a) => a.start >= paraStart && a.start < paraStart + para.length,
      );

      const parts: React.ReactNode[] = [];
      let pos = 0;

      for (const ann of paraAnns) {
        const ls = ann.start - paraStart;
        const le = ann.end - paraStart;
        if (ls < 0) continue;

        if (ls > pos) {
          parts.push(<span key={`t-${paraIdx}-${pos}`}>{para.slice(pos, ls)}</span>);
        }

        const meta = writingFeedbackMeta[ann.category];
        const seqNum = (annIndexMap.get(ann.id) ?? 0) + 1;
        const isEditing = editingId === ann.id;

        parts.push(
          <span
            key={`a-${ann.id}`}
            data-ann-anchor-id={ann.id}
            tabIndex={0}
            className={`tr-ann-inline${isEditing ? " tr-ann-inline-editing" : ""}`}
            style={
              {
                backgroundColor: meta.soft,
                borderBottom: `2px solid ${meta.color}`,
              } as React.CSSProperties
            }
          >
            <span
              className={`comment-bubble tr-ann-bubble${isEditing ? " tr-ann-bubble-editing" : ""}`}
              contentEditable={false}
            >
              {isEditing ? (
                <span className="tr-ann-short-input-wrap" style={{ borderColor: meta.color }}>
                  <span className="tr-ann-editor-label" style={{ color: meta.color }}>
                    {meta.label} — Enter for Live note
                  </span>
                  <input
                    ref={(node) => {
                      inputRefs.current[ann.id] = node;
                    }}
                    className="tr-ann-short-input"
                    style={{ color: meta.color, borderColor: meta.color }}
                    value={ann.inlineComment}
                    placeholder="Short tag…"
                    aria-label="Short inline tag"
                    onChange={(e) => updateInlineAnnotation(ann.id, e.target.value)}
                    onBlur={() => finishEditing(ann.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        transitionToDetail(ann.id);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        finishEditing(ann.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="tr-ann-remove"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => deleteAnnotation(ann.id)}
                    aria-label="Remove annotation"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="tr-ann-bubble-read"
                  style={{ color: meta.color, borderColor: meta.color }}
                  onClick={() => {
                    setActiveNoteId(ann.id);
                    setDetailFocusId(ann.id);
                  }}
                >
                  <span className="tr-ann-bubble-idx">[{seqNum}]</span>
                  {ann.inlineComment.trim() || "???"}
                </button>
              )}
            </span>
            <span
              onClick={() => {
                setActiveNoteId(ann.id);
                if (!editingId) setEditingId(ann.id);
              }}
              title="Click to edit short tag"
            >
              {para.slice(ls, le)}
            </span>
          </span>,
        );
        pos = le;
      }

      if (pos < para.length) {
        parts.push(<span key={`te-${paraIdx}`}>{para.slice(pos)}</span>);
      }

      return <p key={paraIdx} className="tr-essay-para">{parts}</p>;
    });
  }

  function openReport(target: "_self" | "_blank") {
    window.open(`/writing/submissions/${submission.id}/report`, target, "noopener,noreferrer");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="stack-md">
      <div className="tr-breadcrumb-bar">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <span><Link href="/">Home</Link> / </span>
          <span><Link href="/admin/writing">Admin</Link> / </span>
          <span><Link href="/admin/writing/reviews">Inbox</Link> / </span>
          <span>{submission.studentName}</span>
        </nav>
        <span
          className={`tr-status-chip ${reviewSent ? "tr-status-chip-sent" : "tr-status-chip-draft"}`}
        >
          {reviewSent ? "Sent to student" : "Draft review"}
        </span>
      </div>

      <div className="tr-workspace">
        {/* ── Left: essay panel ── */}
        <div className="tr-essay-panel">
          <div className="tr-essay-header">
            <div>
              <h2>{submission.studentName}&apos;s script</h2>
              <div className="tr-essay-meta">
                <span className="tr-meta-chip">{prompt.task.toUpperCase()}</span>
                <span className="tr-meta-chip">{prompt.topic}</span>
                <span className="tr-meta-chip">Submitted {submission.submittedAt}</span>
              </div>
            </div>
            <div className="tr-essay-legend">
              {FEEDBACK_ORDER.map((category) => {
                const meta = writingFeedbackMeta[category];
                return (
                  <span
                    key={category}
                    className="tr-legend-chip"
                    style={{ background: meta.soft, borderColor: meta.color, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="tr-essay-scroll">
            <p className="tr-editor-hint">
              Highlight text, choose a criterion, write a short inline note, then add a fuller
              teacher note in Live notes. Click any note card to jump back to that phrase.
            </p>
            <div className="tr-editor-canvas">
              <div ref={editorRef} className="tr-essay-text tr-essay-prototype-doc">
                {renderEssay()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: sidebar ── */}
        <div className="tr-sidebar">
          {/* Live notes — scrollable, fills remaining space */}
          <section className="tr-section tr-quick-notes">
            <h3 className="tr-section-title">
              Live notes
              <span className="tr-count-badge">{annotations.length}</span>
            </h3>
            <div className="tr-quick-notes-list" ref={annsScrollRef}>
              {annotations.length === 0 ? (
                <p className="tr-notes-empty">
                  No notes yet. Start by highlighting any phrase in the essay.
                </p>
              ) : (
                annotations.map((annotation, index) => {
                  const meta = writingFeedbackMeta[annotation.category];
                  const isDictatingThisNote =
                    dictation.activeSession?.noteId === annotation.id;
                  const activeLang = dictation.activeSession?.lang;
                  return (
                    <article
                      key={annotation.id}
                      data-ann-id={annotation.id}
                      className={`tr-quick-note ${
                        activeNoteId === annotation.id ? "tr-quick-note-active" : ""
                      }`}
                      style={{ borderColor: meta.color }}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            "textarea, input, button, .tr-editor-box, .tr-dictation-block",
                          )
                        ) {
                          return;
                        }
                        focusAnnotationMark(annotation.id);
                      }}
                    >
                      <div className="tr-quick-note-top">
                        <span
                          className="tr-note-card-tag"
                          style={{ background: meta.soft, color: meta.color }}
                        >
                          {index + 1}. {meta.label}
                        </span>
                        <button
                          type="button"
                          className="tr-ann-delete"
                          onClick={() => deleteAnnotation(annotation.id)}
                          title="Remove annotation"
                        >
                          ×
                        </button>
                      </div>
                      <div className="tr-note-selection">
                        <span className="tr-note-section-label">Selected text</span>
                        <strong>{shortenText(rawText.slice(annotation.start, annotation.end), 52)}</strong>
                      </div>
                      <span className="tr-note-section-label">Teacher note</span>
                      <div className="tr-editor-box">
                        <textarea
                          ref={(node) => { detailRefs.current[annotation.id] = node; }}
                          className="tr-ann-textarea"
                          placeholder="Add the fuller note for the annex and PDF…"
                          value={annotation.detailComment}
                          autoFocus={
                            annotation.id === newestId || annotation.id === detailFocusId
                          }
                          aria-label={`Teacher note for annotation ${index + 1}`}
                          onFocus={() => dictation.clearDictationError()}
                          onBlur={() => {
                            setDetailFocusId((current) =>
                              current === annotation.id ? null : current,
                            );
                          }}
                          onChange={(event) => {
                            const nextText = event.target.value;
                            updateDetailAnnotation(annotation.id, nextText);
                            dictation.syncActiveText(annotation.id, nextText);
                          }}
                        />
                        <div className="tr-dictation-block tr-dictation-inside">
                          <div className="tr-dictation-row">
                            <span className="tr-dictation-label">Live transcription</span>
                            <div className="tr-dictation-actions">
                              {(["en-US", "th-TH"] as DictationLanguage[]).map((lang) => (
                                <button
                                  key={lang}
                                  type="button"
                                  className={`tr-dictation-btn ${
                                    dictation.isListening(annotation.id, lang)
                                      ? "tr-dictation-btn-active"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleStartDetailDictation(
                                      annotation.id,
                                      lang,
                                      annotation.detailComment,
                                    )
                                  }
                                  aria-label={`Start ${LIVE_NOTE_DICTATION_LABELS[lang].full} dictation`}
                                >
                                  {dictation.isListening(annotation.id, lang)
                                    ? `Stop ${LIVE_NOTE_DICTATION_LABELS[lang].short}`
                                    : `Dictate ${LIVE_NOTE_DICTATION_LABELS[lang].short}`}
                                </button>
                              ))}
                            </div>
                          </div>
                          {isDictatingThisNote && activeLang && (
                            <p className="tr-dictation-status">
                              Listening in {LIVE_NOTE_DICTATION_LABELS[activeLang].full}
                              {dictation.interimTranscript
                                ? `: ${dictation.interimTranscript}`
                                : "…"}
                            </p>
                          )}
                          {!dictation.supported && (
                            <p className="tr-dictation-hint">
                              Browser dictation is not available here. Chrome and Safari usually
                              support it best.
                            </p>
                          )}
                          {dictation.errorMessage && dictation.errorNoteId === annotation.id && (
                            <p className="tr-dictation-error">{dictation.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* Band scores — horizontal row, visually separate from live notes */}
          <section className="tr-section tr-band-scores-panel">
            <h3 className="tr-section-title">Band scores</h3>
            <div className="tr-scores-bar" role="group" aria-label="Band scores">
              {FEEDBACK_ORDER.map((category) => {
                const meta = writingFeedbackMeta[category];
                const value = scores[category];
                return (
                  <div
                    key={category}
                    className="tr-score-pill"
                    style={{ borderLeftColor: meta.color }}
                  >
                    <label className="tr-score-pill-label" htmlFor={`score-${category}`}>
                      <span
                        className="tr-score-dot"
                        style={{ background: meta.soft, borderColor: meta.color }}
                      />
                      <span className="tr-score-pill-name">{meta.label}</span>
                    </label>
                    <input
                      id={`score-${category}`}
                      className="tr-score-pill-input"
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      value={value}
                      onChange={(event) =>
                        setScores((previous) => ({
                          ...previous,
                          [category]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                );
              })}
              <div className="tr-score-pill tr-score-pill-overall">
                <span className="tr-score-pill-label tr-score-pill-label-static">Overall</span>
                <div className="tr-score-pill-readout" aria-live="polite">
                  {totalScore.toFixed(1)}
                </div>
              </div>
            </div>
          </section>

          {/* Overall comment — fixed */}
          <div className="tr-comment-section">
            <h3 className="tr-section-title" style={{ marginBottom: 6 }}>
              Overall comment
            </h3>
            <div className="tr-editor-box tr-overall-editor-box">
              <textarea
                className="tr-overall-textarea"
                value={comment}
                onFocus={() => dictation.clearDictationError()}
                onChange={(event) => {
                  const nextText = event.target.value;
                  setComment(nextText);
                  dictation.syncActiveText(OVERALL_COMMENT_DICTATION_ID, nextText);
                }}
                placeholder="Write an overall summary for the student…"
              />
              <div className="tr-dictation-block tr-dictation-inside tr-overall-dictation">
                <div className="tr-dictation-row">
                  <span className="tr-dictation-label">Live transcription</span>
                  <div className="tr-dictation-actions">
                    {(["en-US", "th-TH"] as DictationLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className={`tr-dictation-btn ${
                          dictation.isListening(OVERALL_COMMENT_DICTATION_ID, lang)
                            ? "tr-dictation-btn-active"
                            : ""
                        }`}
                        onClick={() => handleStartOverallDictation(lang)}
                        aria-label={`Start ${LIVE_NOTE_DICTATION_LABELS[lang].full} dictation for overall comment`}
                      >
                        {dictation.isListening(OVERALL_COMMENT_DICTATION_ID, lang)
                          ? `Stop ${LIVE_NOTE_DICTATION_LABELS[lang].short}`
                          : `Dictate ${LIVE_NOTE_DICTATION_LABELS[lang].short}`}
                      </button>
                    ))}
                  </div>
                </div>
                {dictation.activeSession?.noteId === OVERALL_COMMENT_DICTATION_ID &&
                  dictation.activeSession.lang && (
                    <p className="tr-dictation-status">
                      Listening in {LIVE_NOTE_DICTATION_LABELS[dictation.activeSession.lang].full}
                      {dictation.interimTranscript ? `: ${dictation.interimTranscript}` : "…"}
                    </p>
                  )}
                {dictation.errorMessage &&
                  dictation.errorNoteId === OVERALL_COMMENT_DICTATION_ID && (
                    <p className="tr-dictation-error">{dictation.errorMessage}</p>
                  )}
              </div>
            </div>
          </div>

          {/* Actions — pinned at bottom */}
          <div className="tr-actions">
            <button
              type="button"
              className="tr-preview-link"
              onClick={() => openReport("_blank")}
            >
              Export to PDF
            </button>
            <button
              type="button"
              className="tr-send-btn"
              disabled={reviewSent}
              onClick={() => setReviewSent(true)}
            >
              {reviewSent ? "Review sent ✓" : "Send to student"}
            </button>
            <button
              type="button"
              className="tr-preview-link"
              onClick={() => openReport("_self")}
            >
              Preview report
            </button>
          </div>

          {reviewSent && (
            <div className="tr-sent-banner">
              <strong>Feedback returned</strong>
              <p>
                The student can now view the marked report and export it as a clean PDF.
              </p>
            </div>
          )}
        </div>
      </div>

      {toolbar.show && (
        <div className="tr-floating-toolbar" style={{ top: toolbar.top, left: toolbar.left }}>
          {FEEDBACK_ORDER.map((category) => {
            const meta = writingFeedbackMeta[category];
            return (
              <button
                key={category}
                type="button"
                className="tr-toolbar-btn"
                style={{ background: meta.soft, borderColor: meta.color, color: meta.color }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  addAnnotation(category);
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
