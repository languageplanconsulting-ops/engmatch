"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ReadingTest,
  ReadingQuestion,
  ReadingPassage,
  StudentAnswer,
  HintRange,
} from "@/lib/reading-demo";
import { getAllQuestions, scoreAttempt } from "@/lib/reading-demo";

// ─── Highlight colours ────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { id: "yellow", bg: "rgba(253, 224, 71, 0.55)", label: "Yellow" },
  { id: "green", bg: "rgba(134, 239, 172, 0.55)", label: "Green" },
  { id: "cyan", bg: "rgba(103, 232, 249, 0.5)", label: "Cyan" },
] as const;

type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]["id"];

type UserHighlight = {
  passageId: string;
  start: number;
  end: number;
  color: string;
};

// ─── Passage text renderer ────────────────────────────────────────────────────

function renderPassageText(
  text: string,
  passageId: string,
  userHighlights: UserHighlight[],
  activeHint: (HintRange & { passageId: string }) | null,
  hintMarkRef: React.RefObject<HTMLElement | null>,
): React.ReactNode {
  type Span = {
    start: number;
    end: number;
    kind: "plain" | "user" | "hint";
    bg?: string;
  };

  // Collect all ranges for this passage
  const ranges: Span[] = [];

  for (const h of userHighlights) {
    if (h.passageId === passageId) {
      ranges.push({ start: h.start, end: h.end, kind: "user", bg: h.color });
    }
  }
  if (activeHint && activeHint.passageId === passageId) {
    ranges.push({ start: activeHint.start, end: activeHint.end, kind: "hint" });
  }

  if (ranges.length === 0) return text;

  // Sort by start, resolve overlaps by keeping earlier one dominant
  ranges.sort((a, b) => a.start - b.start);

  const spans: Span[] = [];
  let pos = 0;

  for (const r of ranges) {
    const start = Math.max(r.start, pos);
    if (start >= r.end) continue; // fully overlapped, skip
    if (start > pos) {
      spans.push({ start: pos, end: start, kind: "plain" });
    }
    spans.push({ start, end: r.end, kind: r.kind, bg: r.bg });
    pos = r.end;
  }
  if (pos < text.length) {
    spans.push({ start: pos, end: text.length, kind: "plain" });
  }

  return spans.map((seg, i) => {
    const content = text.slice(seg.start, seg.end);
    if (seg.kind === "plain") return <span key={i}>{content}</span>;
    if (seg.kind === "hint") {
      return (
        <mark
          key={i}
          className="reading-hint"
          ref={(el) => {
            if (el) (hintMarkRef as React.MutableRefObject<HTMLElement | null>).current = el;
          }}
        >
          {content}
        </mark>
      );
    }
    return (
      <mark key={i} className="reading-user-highlight" style={{ background: seg.bg }}>
        {content}
      </mark>
    );
  });
}

// ─── Get character offset within a container ──────────────────────────────────

function getSelectionOffsets(
  container: HTMLElement,
): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const preStart = range.cloneRange();
  preStart.selectNodeContents(container);
  preStart.setEnd(range.startContainer, range.startOffset);
  const start = preStart.toString().length;

  const preEnd = range.cloneRange();
  preEnd.selectNodeContents(container);
  preEnd.setEnd(range.endContainer, range.endOffset);
  const end = preEnd.toString().length;

  if (start === end) return null;
  return { start, end };
}

// ─── Timer hook ───────────────────────────────────────────────────────────────

function useCountdown(totalSeconds: number) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return { display: `${mm}:${ss}`, isWarn: remaining < 180 };
}

// ─── Question type label ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  "fill-in-blank": "Fill in blank",
  "multiple-choice": "Multiple choice",
  "matching-heading": "Match heading",
  "matching-information": "Match info",
};

// ─── Single question card ─────────────────────────────────────────────────────

function QuestionCard({
  question,
  answer,
  onAnswer,
  onHint,
  hintActive,
  allowHint,
}: {
  question: ReadingQuestion;
  answer: string;
  onAnswer: (value: string) => void;
  onHint: () => void;
  hintActive: boolean;
  allowHint: boolean;
}) {
  return (
    <article className="reading-q-card">
      <div className="reading-q-header">
        <span className="reading-q-number">Q{question.number}</span>
        <span className="reading-q-type-badge">{TYPE_LABELS[question.type]}</span>
      </div>

      <p className="reading-q-text">{question.text}</p>

      {question.type === "fill-in-blank" && (
        <input
          className="reading-fib-input"
          type="text"
          placeholder="Type your answer…"
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
        />
      )}

      {question.type === "multiple-choice" && (
        <div className="reading-options-list">
          {question.options.map((opt) => {
            const letter = opt.charAt(0);
            const isSelected = answer === letter;
            return (
              <label
                key={opt}
                className={`reading-option-label${isSelected ? " reading-option-label-selected" : ""}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={letter}
                  checked={isSelected}
                  onChange={() => onAnswer(letter)}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {(question.type === "matching-heading" ||
        question.type === "matching-information") && (
        <div className="reading-options-list">
          {question.options.map((opt) => {
            const isSelected = answer === opt;
            return (
              <label
                key={opt}
                className={`reading-option-label${isSelected ? " reading-option-label-selected" : ""}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt}
                  checked={isSelected}
                  onChange={() => onAnswer(opt)}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {allowHint ? (
        <button
          className={`reading-hint-btn${hintActive ? " reading-hint-btn-active" : ""}`}
          onClick={onHint}
          type="button"
        >
          {hintActive ? "Hint shown ↑" : "Show hint"}
        </button>
      ) : null}
    </article>
  );
}

// ─── Passage panel ────────────────────────────────────────────────────────────

function PassagePanel({
  passages,
  userHighlights,
  selectedColor,
  onSelectColor,
  onClearHighlights,
  onTextMouseUp,
  activeHint,
  passageTextRefs,
  hintMarkRef,
}: {
  passages: ReadingPassage[];
  userHighlights: UserHighlight[];
  selectedColor: HighlightColor;
  onSelectColor: (c: HighlightColor) => void;
  onClearHighlights: () => void;
  onTextMouseUp: (passageId: string) => void;
  activeHint: (HintRange & { passageId: string }) | null;
  passageTextRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  hintMarkRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <div className="reading-passage-panel">
      <div className="reading-panel-header">
        <h2>Passage</h2>
        <div className="reading-highlight-picker">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              className={`reading-highlight-swatch${selectedColor === c.id ? " reading-highlight-swatch-active" : ""}`}
              style={{ background: c.bg }}
              onClick={() => onSelectColor(c.id)}
            />
          ))}
          <button
            type="button"
            className="reading-highlight-clear"
            onClick={onClearHighlights}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="reading-panel-scroll">
        <div className="reading-passage-section">
          {passages.map((passage) => (
            <div key={passage.id}>
              <p className="reading-passage-title">{passage.title}</p>
              <div
                className="reading-passage-text"
                ref={(el) => {
                  passageTextRefs.current[passage.id] = el;
                }}
                onMouseUp={() => onTextMouseUp(passage.id)}
              >
                {renderPassageText(
                  passage.text,
                  passage.id,
                  userHighlights,
                  activeHint,
                  hintMarkRef,
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Questions panel ──────────────────────────────────────────────────────────

function QuestionsPanel({
  test,
  answers,
  onAnswer,
  activeHintId,
  onHint,
  onSubmit,
  timer,
  allowHint,
}: {
  test: ReadingTest;
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
  activeHintId: string | null;
  onHint: (question: ReadingQuestion, passageId: string) => void;
  onSubmit: () => void;
  timer: { display: string; isWarn: boolean };
  allowHint: boolean;
}) {
  const answered = Object.values(answers).filter((v) => v.trim().length > 0).length;
  const total = getAllQuestions(test).length;

  return (
    <div className="reading-questions-panel">
      <div className="reading-panel-header">
        <h2>Questions</h2>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700 }}>
          {answered}/{total} answered
        </span>
      </div>

      <div className="reading-panel-scroll">
        <div className="reading-question-list">
          {test.passages.map((passage) => (
            <div key={passage.id} className="reading-passage-group">
              {test.passages.length > 1 && (
                <p className="reading-question-group-label">{passage.title}</p>
              )}
              {passage.questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  answer={answers[q.id] ?? ""}
                  onAnswer={(val) => onAnswer(q.id, val)}
                  hintActive={activeHintId === q.id}
                  onHint={() => onHint(q, passage.id)}
                  allowHint={allowHint}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="reading-action-bar">
        <span className={`reading-timer${timer.isWarn ? " reading-timer-warn" : ""}`}>
          ⏱ {timer.display}
        </span>
        <button type="button" className="reading-submit-btn" onClick={onSubmit}>
          Submit answers
        </button>
      </div>
    </div>
  );
}

// ─── Main workspace ───────────────────────────────────────────────────────────

export function ReadingWorkspace({ test }: { test: ReadingTest }) {
  const router = useRouter();
  const allowHint = test.type !== "full";

  // Answers: { questionId → value }
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // User highlights: array of { passageId, start, end, color }
  const [userHighlights, setUserHighlights] = useState<UserHighlight[]>([]);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("yellow");

  // Active hint: which question's hint is showing
  const [activeHintId, setActiveHintId] = useState<string | null>(null);
  const [activeHint, setActiveHint] = useState<(HintRange & { passageId: string }) | null>(null);

  // Refs to passage text containers (keyed by passage.id) for offset calculation
  const passageTextRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Ref to the rendered hint <mark> so we can scroll to it
  const hintMarkRef = useRef<HTMLElement | null>(null);

  const timer = useCountdown(test.timeLimit * 60);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleTextMouseUp = useCallback(
    (passageId: string) => {
      const container = passageTextRefs.current[passageId];
      if (!container) return;

      const offsets = getSelectionOffsets(container);
      if (!offsets) return;

      const colorBg = HIGHLIGHT_COLORS.find((c) => c.id === selectedColor)?.bg ?? "";
      setUserHighlights((prev) => [
        ...prev,
        { passageId, start: offsets.start, end: offsets.end, color: colorBg },
      ]);

      window.getSelection()?.removeAllRanges();
    },
    [selectedColor],
  );

  const handleClearHighlights = useCallback(() => {
    setUserHighlights([]);
  }, []);

  const handleHint = useCallback(
    (question: ReadingQuestion, passageId: string) => {
      if (activeHintId === question.id) {
        // Toggle off
        setActiveHintId(null);
        setActiveHint(null);
      } else {
        setActiveHintId(question.id);
        setActiveHint({ ...question.hint, passageId });
      }
    },
    [activeHintId],
  );

  // Scroll hint mark into view whenever it changes
  useEffect(() => {
    if (!activeHint) return;
    // Small delay to let the DOM re-render with the mark element
    const id = setTimeout(() => {
      hintMarkRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => clearTimeout(id);
  }, [activeHint]);

  const handleSubmit = useCallback(() => {
    const result = scoreAttempt(test, Object.entries(answers).map(([questionId, value]) => ({ questionId, value })));

    // Store result in sessionStorage so results page can read it
    sessionStorage.setItem(
      `reading-result-${test.id}`,
      JSON.stringify({ answers, score: result, testId: test.id, submittedAt: new Date().toISOString() }),
    );

    router.push(`/reading/sets/${test.id}/results`);
  }, [test, answers, router]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="stack-md">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span><a href="/">Home</a> / </span>
        <span><a href="/reading">Reading</a> / </span>
        <span>{test.title}</span>
      </nav>

      <div className="reading-split">
        <PassagePanel
          passages={test.passages}
          userHighlights={userHighlights}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
          onClearHighlights={handleClearHighlights}
          onTextMouseUp={handleTextMouseUp}
          activeHint={activeHint}
          passageTextRefs={passageTextRefs}
          hintMarkRef={hintMarkRef}
        />
        <QuestionsPanel
          test={test}
          answers={answers}
          onAnswer={handleAnswer}
          activeHintId={activeHintId}
          onHint={handleHint}
          onSubmit={handleSubmit}
          timer={timer}
          allowHint={allowHint}
        />
      </div>
    </div>
  );
}
