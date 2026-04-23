"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  writingFeedbackMeta,
  type WritingFeedbackCategory,
} from "@/lib/writing-demo";
import {
  LIVE_NOTE_DICTATION_LABELS,
  type DictationLanguage,
  useLiveNoteDictation,
} from "@/components/writing/use-live-note-dictation";
// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "setup" | "review";

type SetupData = {
  studentName: string;
  taskType: "task-1" | "task-2";
  promptTitle: string;
  essayText: string;
};

type InlineAnnotation = {
  id: number;
  start: number;
  end: number;
  category: WritingFeedbackCategory;
  inlineComment: string;
  detailComment: string;
};

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

type Scores = Record<WritingFeedbackCategory, number>;

const FEEDBACK_ORDER: WritingFeedbackCategory[] = [
  "grammar",
  "vocabulary",
  "coherence",
  "taskAchievement",
];
const OVERALL_COMMENT_DICTATION_ID = -1;

const DEFAULT_SCORES: Scores = {
  grammar: 6.5,
  vocabulary: 6.5,
  coherence: 6.5,
  taskAchievement: 6.5,
};

function shortenText(text: string, limit = 56) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trimEnd()}…`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Setup form ───────────────────────────────────────────────────────────────

function SetupForm({ onStart }: { onStart: (data: SetupData) => void }) {
  const [studentName, setStudentName] = useState("");
  const [taskType, setTaskType] = useState<"task-1" | "task-2">("task-2");
  const [promptTitle, setPromptTitle] = useState("");
  const [essayText, setEssayText] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (essayText.trim().length < 20) {
      setError("Please paste the student's essay before starting.");
      return;
    }
    setError("");
    onStart({
      studentName: studentName.trim() || "Student",
      taskType,
      promptTitle: promptTitle.trim() || (taskType === "task-1" ? "Task 1 — Data Description" : "Task 2 — Discussion Essay"),
      essayText: essayText.trim(),
    });
  }

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  return (
    <div className="qr-setup-page">
      <div className="qr-setup-card">
        {/* Header */}
        <div className="qr-setup-header">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <span><Link href="/">Home</Link> / </span>
            <span><Link href="/admin/writing">Writing Admin</Link> / </span>
            <span>Quick Review</span>
          </nav>
          <h1 className="qr-setup-title">Quick Review</h1>
          <p className="qr-setup-sub">
            Paste any essay, annotate inline, score all four criteria, and export a formatted PDF report — no upload needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="qr-setup-form">
          {/* Row: student name + task */}
          <div className="qr-setup-row">
            <label className="qr-field">
              <span className="qr-field-label">Student name <em>(optional)</em></span>
              <input
                type="text"
                className="qr-input"
                placeholder="e.g. Ploy Sincharoen"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </label>

            <label className="qr-field">
              <span className="qr-field-label">Task type</span>
              <select
                className="qr-select"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as "task-1" | "task-2")}
              >
                <option value="task-1">Task 1 — Academic report / Letter</option>
                <option value="task-2">Task 2 — Discussion / Opinion essay</option>
              </select>
            </label>
          </div>

          {/* Prompt title */}
          <label className="qr-field">
            <span className="qr-field-label">Prompt / question title <em>(optional)</em></span>
            <input
              type="text"
              className="qr-input"
              placeholder="e.g. Some people believe technology has made us less social…"
              value={promptTitle}
              onChange={(e) => setPromptTitle(e.target.value)}
            />
          </label>

          {/* Essay paste */}
          <label className="qr-field qr-field-grow">
            <span className="qr-field-label">
              Essay text
              {wordCount > 0 && (
                <span className="qr-word-count">{wordCount} words</span>
              )}
            </span>
            <textarea
              className="qr-paste-area"
              placeholder="Paste the student's essay here…"
              value={essayText}
              onChange={(e) => { setEssayText(e.target.value); setError(""); }}
              spellCheck={false}
            />
          </label>

          {error && <p className="qr-error">{error}</p>}

          <button type="submit" className="qr-start-btn">
            Start Review →
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Print view (rendered always, visible only in @media print) ───────────────

function PrintView({
  setup,
  annotations,
  scores,
  totalScore,
  comment,
}: {
  setup: SetupData;
  annotations: InlineAnnotation[];
  scores: Scores;
  totalScore: number;
  comment: string;
}) {
  const annIndexMap = new Map(annotations.map((a, i) => [a.id, i]));
  const paragraphs = setup.essayText.split("\n\n").filter(Boolean);
  const paragraphOffsets = paragraphs.reduce<number[]>((offsets, paragraph, index) => {
    if (index === 0) {
      offsets.push(0);
    } else {
      offsets.push(offsets[index - 1] + paragraphs[index - 1].length + 2);
    }
    return offsets;
  }, []);

  // Map annotations to paragraphs
  function getParaAnnotations(paraIndex: number, paraStart: number, para: string) {
    const paraEnd = paraStart + para.length;
    return annotations.filter((a) => a.start >= paraStart && a.start < paraEnd);
  }

  function renderParaWithMarks(para: string, paraStart: number, paraAnns: InlineAnnotation[]) {
    const local = paraAnns.map((a) => ({ ...a, ls: a.start - paraStart, le: a.end - paraStart }));
    local.sort((a, b) => a.ls - b.ls);

    const parts: React.ReactNode[] = [];
    let pos = 0;
    for (const ann of local) {
      if (ann.ls < 0) continue;
      if (ann.ls > pos) parts.push(<span key={`t-${pos}`}>{para.slice(pos, ann.ls)}</span>);
      const meta = writingFeedbackMeta[ann.category];
      const seqNum = (annIndexMap.get(ann.id) ?? 0) + 1;
      const shortLine =
        ann.inlineComment.replace(/\s+/g, " ").trim() || "???";
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
            {para.slice(ann.ls, ann.le)}
          </mark>
          <sup className="pdf-ann-sup" style={{ color: meta.color }}>[{seqNum}]</sup>
        </span>,
      );
      pos = ann.le;
    }
    if (pos < para.length) parts.push(<span key="t-end">{para.slice(pos)}</span>);
    return parts;
  }

  return (
    <div className="qr-print-only">
      <article className="pdf-report">
        {/* Header */}
        <header className="pdf-header">
          <div className="pdf-brand">
            <span className="pdf-brand-name">English Plan</span>
            <span className="pdf-brand-sub">IELTS Academic Writing</span>
          </div>
          <div className="pdf-header-right">
            <span className="pdf-report-label">Feedback Report</span>
            <span className="pdf-task-badge">{setup.taskType.replace("-", " ").toUpperCase()}</span>
          </div>
        </header>

        {/* Info bar */}
        <div className="pdf-info-bar">
          <div className="pdf-info-cell">
            <span>Student</span>
            <strong>{setup.studentName}</strong>
          </div>
          <div className="pdf-info-cell">
            <span>Task</span>
            <strong>{setup.taskType === "task-1" ? "Task 1" : "Task 2"}</strong>
          </div>
          <div className="pdf-info-cell">
            <span>Reviewed</span>
            <strong>{today()}</strong>
          </div>
          <div className="pdf-info-cell">
            <span>Word count</span>
            <strong>{setup.essayText.trim().split(/\s+/).length}</strong>
          </div>
        </div>

        {/* Prompt */}
        <div className="pdf-prompt-bar">
          <p className="pdf-prompt-label">Prompt</p>
          <p className="pdf-prompt-title">{setup.promptTitle}</p>
        </div>

        {/* Band scores */}
        <section className="pdf-scores-section">
          <h3 className="pdf-scores-heading">Band Scores</h3>
          <div className="pdf-scores-grid">
            {FEEDBACK_ORDER.map((cat) => {
              const meta = writingFeedbackMeta[cat];
              const val = scores[cat];
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
            })}
            <div className="pdf-score-cell pdf-score-overall" style={{ borderColor: "#111" }}>
              <span>Overall Band</span>
              <strong>{totalScore.toFixed(1)}</strong>
            </div>
          </div>
        </section>

        {/* Teacher comment */}
        {comment && (
          <section className="pdf-summary-section">
            <h3 className="pdf-summary-heading">Teacher&apos;s Comment</h3>
            <p className="pdf-summary-text">{comment}</p>
          </section>
        )}

        {/* Legend */}
        {annotations.length > 0 && (
          <div className="pdf-legend" style={{ margin: "0 28px 8px" }}>
            <span className="pdf-legend-title">Feedback key</span>
            {FEEDBACK_ORDER.map((cat) => {
              const meta = writingFeedbackMeta[cat];
              if (!annotations.some((a) => a.category === cat)) return null;
              return (
                <span key={cat} className="pdf-legend-item">
                  <span className="pdf-legend-dot" style={{ background: meta.soft, borderColor: meta.color }} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Essay with annotations */}
        <section className="pdf-essay-section">
          <h3 className="pdf-essay-heading">Annotated Essay</h3>
          {paragraphs.map((para, i) => {
            const start = paragraphOffsets[i] ?? 0;
            const paraAnns = getParaAnnotations(i, start, para);
            return (
              <div key={i} className="pdf-essay-block">
                <p className="pdf-para-num">Paragraph {i + 1}</p>
                <p className="pdf-para-text">
                  {paraAnns.length > 0 ? renderParaWithMarks(para, start, paraAnns) : para}
                </p>
                {paraAnns.length > 0 && (
                  <div className="pdf-para-notes">
                    <p className="pdf-para-notes-heading">Live notes</p>
                    {paraAnns.map((ann) => {
                      const meta = writingFeedbackMeta[ann.category];
                      const seqNum = (annIndexMap.get(ann.id) ?? 0) + 1;
                      const shortTag = ann.inlineComment.replace(/\s+/g, " ").trim();
                      const teacherBody = ann.detailComment.trim();
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
                          <p className="pdf-note-quote">
                            &ldquo;{setup.essayText.slice(ann.start, ann.end)}&rdquo;
                          </p>
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

        <footer className="pdf-footer">
          <span>English Plan</span>
          <span>Confidential — For student use only</span>
        </footer>
      </article>
    </div>
  );
}

// ─── Main workspace ───────────────────────────────────────────────────────────

function ReviewWorkspace({
  setup,
  onReset,
}: {
  setup: SetupData;
  onReset: () => void;
}) {
  const rawText = setup.essayText;
  const editorRef = useRef<HTMLDivElement>(null);
  const annsScrollRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const skipInlineBlurRef = useRef(false);
  const detailRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const nextId = useRef(1);

  const [annotations, setAnnotations] = useState<InlineAnnotation[]>([]);
  const [toolbar, setToolbar] = useState<ToolbarState>({
    show: false, top: 0, left: 0, start: 0, end: 0,
  });
  const [newestId, setNewestId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailFocusId, setDetailFocusId] = useState<number | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [scores, setScores] = useState<Scores>(DEFAULT_SCORES);
  const [comment, setComment] = useState("");
  const updateDetailAnnotation = useCallback((id: number, detailComment: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, detailComment } : a)),
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
    const vals = Object.values(scores);
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 2) / 2;
  }, [scores]);

  // ── Offset calculation ────────────────────────────────────────────────────────

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
      if (node === container) { total += offset; break; }
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

  // ── Selection handler ─────────────────────────────────────────────────────────

  const handleMouseUp = useCallback(() => {
    if (editingId !== null) {
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setToolbar((t) => ({ ...t, show: false }));
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      setToolbar((t) => ({ ...t, show: false }));
      return;
    }
    const startBoundary = resolveBoundary(range.startContainer, range.startOffset);
    const endBoundary = resolveBoundary(range.endContainer, range.endOffset);
    const start = getAbsoluteOffset(startBoundary.container, startBoundary.offset);
    const end = getAbsoluteOffset(endBoundary.container, endBoundary.offset);
    if (start === end) { setToolbar((t) => ({ ...t, show: false })); return; }

    const overlaps = annotations.some(
      (a) =>
        (start >= a.start && start < a.end) ||
        (end > a.start && end <= a.end) ||
        (start <= a.start && end >= a.end),
    );
    if (overlaps) { setToolbar((t) => ({ ...t, show: false })); return; }

    const rect = range.getBoundingClientRect();
    setToolbar({
      show: true,
      top: Math.max(8, rect.top - 54),
      left: rect.left + rect.width / 2,
      start,
      end,
    });
  }, [annotations, editingId]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  // ── Add / update / delete annotations ────────────────────────────────────────

  function addAnnotation(category: WritingFeedbackCategory) {
    const id = nextId.current++;
    setAnnotations((prev) =>
      [
        ...prev,
        {
          id,
          start: toolbar.start,
          end: toolbar.end,
          category,
          inlineComment: "",
          detailComment: "",
        },
      ].sort(
        (a, b) => a.start - b.start,
      ),
    );
    setToolbar({ show: false, top: 0, left: 0, start: 0, end: 0 });
    window.getSelection()?.removeAllRanges();
    setNewestId(id);
    setEditingId(id);
  }

  function updateInlineAnnotation(id: number, inlineComment: string) {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, inlineComment } : a)),
    );
  }

  function deleteAnnotation(id: number) {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) setEditingId(null);
    if (detailFocusId === id) setDetailFocusId(null);
  }

  useEffect(() => {
    if (editingId === null) return;
    inputRefs.current[editingId]?.focus();
  }, [editingId]);

  useEffect(() => {
    if (detailFocusId === null) return;
    detailRefs.current[detailFocusId]?.focus();
  }, [detailFocusId]);

  function transitionToDetail(id: number) {
    skipInlineBlurRef.current = true;
    setEditingId(null);
    setDetailFocusId(id);
    requestAnimationFrame(() => {
      skipInlineBlurRef.current = false;
    });
  }

  function finishInlineComment(id: number) {
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

  // Auto-scroll sidebar to new card
  useEffect(() => {
    if (newestId === null) return;
    const el = annsScrollRef.current?.querySelector(`[data-ann-id="${newestId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [newestId]);

  // ── Render essay (by paragraph so \n\n gets normal spacing, not giant line-height) ──

  function renderEssay() {
    const paragraphs = rawText.split("\n\n");
    // map annotation id → global index for superscript numbers
    const annIndexMap = new Map(annotations.map((a, i) => [a.id, i]));
    let paraOffset = 0;

    return paragraphs.map((para, paraIdx) => {
      const paraStart = paraOffset;
      paraOffset += para.length + 2; // +2 for removed \n\n

      // Annotations that fall inside this paragraph
      const paraAnns = annotations.filter(
        (a) => a.start >= paraStart && a.start < paraStart + para.length,
      );

      const parts: React.ReactNode[] = [];
      let pos = 0; // cursor within this paragraph string

      for (const ann of paraAnns) {
        const ls = ann.start - paraStart;
        const le = ann.end - paraStart;
        if (ls < 0) continue;

        // Plain text before this annotation
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
                    onBlur={() => finishInlineComment(ann.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        transitionToDetail(ann.id);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        finishInlineComment(ann.id);
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

      // Remaining text in paragraph
      if (pos < para.length) {
        parts.push(<span key={`te-${paraIdx}`}>{para.slice(pos)}</span>);
      }

      return <p key={paraIdx} className="tr-essay-para">{parts}</p>;
    });
  }

  function handleExport() {
    setTimeout(() => window.print(), 80);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Screen workspace ── */}
      <div className="qr-screen-only stack-md">
        {/* Top bar */}
        <div className="tr-breadcrumb-bar">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <span><Link href="/">Home</Link> / </span>
            <span><Link href="/admin/writing">Writing Admin</Link> / </span>
            <span>Quick Review</span>
          </nav>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="qr-meta-chip">{setup.taskType.toUpperCase()}</span>
            <span className="qr-meta-chip">{setup.studentName}</span>
            <button type="button" className="tr-preview-link" onClick={onReset}>
              ← New review
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="tr-workspace">
          {/* Left: essay */}
          <div className="tr-essay-panel">
            <div className="tr-essay-header">
              <div>
                <h2>{setup.studentName}&apos;s Essay</h2>
                <div className="tr-essay-meta">
                  <span className="tr-meta-chip">{setup.taskType.toUpperCase()}</span>
                  <span className="tr-meta-chip">
                    {rawText.trim().split(/\s+/).length} words
                  </span>
                </div>
              </div>
            </div>
            <div className="tr-essay-scroll">
              <p className="tr-editor-hint">
                Highlight text, choose a category, add a short inline note, then finish the fuller
                teacher note in Live notes. Click any note card to jump back to its phrase.
              </p>
              <div className="tr-editor-canvas">
                <div ref={editorRef} className="tr-essay-text tr-essay-prototype-doc">
                  {renderEssay()}
                </div>
              </div>
            </div>
          </div>

          {/* Right: sidebar */}
          <div className="tr-sidebar">
            {/* Annotations */}
            <section className="tr-section tr-quick-notes">
              <h3 className="tr-section-title">
                Live notes
                <span className="tr-count-badge">{annotations.length}</span>
              </h3>
              <div className="tr-quick-notes-list" ref={annsScrollRef}>
                {annotations.length === 0 ? (
                  <p className="tr-notes-empty">
                    Select text in the essay, then choose a feedback category.
                  </p>
                ) : (
                  annotations.map((ann, i) => {
                    const meta = writingFeedbackMeta[ann.category];
                    const isDictatingThisNote = dictation.activeSession?.noteId === ann.id;
                    const activeLang = dictation.activeSession?.lang;
                    return (
                      <article
                        key={ann.id}
                        data-ann-id={ann.id}
                        className={`tr-quick-note ${
                          activeNoteId === ann.id ? "tr-quick-note-active" : ""
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
                          focusAnnotationMark(ann.id);
                        }}
                      >
                        <div className="tr-quick-note-top">
                          <span
                            className="tr-note-card-tag"
                            style={{ background: meta.soft, color: meta.color }}
                          >
                            {i + 1}. {meta.label}
                          </span>
                          <button
                            type="button"
                            className="tr-ann-delete"
                            onClick={() => deleteAnnotation(ann.id)}
                            title="Remove annotation"
                          >
                            ×
                          </button>
                        </div>
                        <div className="tr-note-selection">
                          <span className="tr-note-section-label">Selected text</span>
                          <strong>{shortenText(rawText.slice(ann.start, ann.end), 52)}</strong>
                        </div>
                        <span className="tr-note-section-label">Teacher note</span>
                        <div className="tr-editor-box">
                          <textarea
                            className="tr-ann-textarea"
                            placeholder="Add the fuller note for the annex and PDF…"
                            ref={(node) => {
                              detailRefs.current[ann.id] = node;
                            }}
                            value={ann.detailComment}
                            autoFocus={ann.id === newestId || ann.id === detailFocusId}
                            aria-label={`Teacher note for annotation ${i + 1}`}
                            onFocus={() => dictation.clearDictationError()}
                            onBlur={() => {
                              setDetailFocusId((current) =>
                                current === ann.id ? null : current,
                              );
                            }}
                            onChange={(e) => {
                              const nextText = e.target.value;
                              updateDetailAnnotation(ann.id, nextText);
                              dictation.syncActiveText(ann.id, nextText);
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
                                      dictation.isListening(ann.id, lang)
                                        ? "tr-dictation-btn-active"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      handleStartDetailDictation(
                                        ann.id,
                                        lang,
                                        ann.detailComment,
                                      )
                                    }
                                    aria-label={`Start ${LIVE_NOTE_DICTATION_LABELS[lang].full} dictation`}
                                  >
                                    {dictation.isListening(ann.id, lang)
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
                            {dictation.errorMessage && dictation.errorNoteId === ann.id && (
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
                {FEEDBACK_ORDER.map((cat) => {
                  const meta = writingFeedbackMeta[cat];
                  const val = scores[cat];
                  return (
                    <div
                      key={cat}
                      className="tr-score-pill"
                      style={{ borderLeftColor: meta.color }}
                    >
                      <label className="tr-score-pill-label" htmlFor={`qr-score-${cat}`}>
                        <span
                          className="tr-score-dot"
                          style={{ background: meta.soft, borderColor: meta.color }}
                        />
                        <span className="tr-score-pill-name">{meta.label}</span>
                      </label>
                      <input
                        id={`qr-score-${cat}`}
                        className="tr-score-pill-input"
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        value={val}
                        onChange={(e) =>
                          setScores((prev) => ({ ...prev, [cat]: Number(e.target.value) }))
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

            {/* Overall comment */}
            <div className="tr-comment-section">
              <h3 className="tr-section-title" style={{ marginBottom: 6 }}>
                Overall comment
              </h3>
              <div className="tr-editor-box tr-overall-editor-box">
                <textarea
                  className="tr-overall-textarea"
                  value={comment}
                  onFocus={() => dictation.clearDictationError()}
                  onChange={(e) => {
                    const nextText = e.target.value;
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

            {/* Export */}
            <div className="tr-actions">
              <button
                type="button"
                className="tr-send-btn tr-export-btn"
                onClick={handleExport}
              >
                Export to PDF ↓
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Print-only report ── */}
      <PrintView
        setup={setup}
        annotations={annotations}
        scores={scores}
        totalScore={totalScore}
        comment={comment}
      />

      {/* ── Floating category toolbar ── */}
      {toolbar.show && (
        <div className="tr-floating-toolbar" style={{ top: toolbar.top, left: toolbar.left }}>
          {FEEDBACK_ORDER.map((cat) => {
            const meta = writingFeedbackMeta[cat];
            return (
              <button
                key={cat}
                type="button"
                className="tr-toolbar-btn"
                style={{ background: meta.soft, borderColor: meta.color, color: meta.color }}
                onMouseDown={(e) => { e.preventDefault(); addAnnotation(cat); }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function QuickReviewWorkspace() {
  const [step, setStep] = useState<Step>("setup");
  const [setup, setSetup] = useState<SetupData | null>(null);

  function handleStart(data: SetupData) {
    setSetup(data);
    setStep("review");
  }

  if (step === "setup" || !setup) {
    return <SetupForm onStart={handleStart} />;
  }

  return <ReviewWorkspace setup={setup} onReset={() => setStep("setup")} />;
}
