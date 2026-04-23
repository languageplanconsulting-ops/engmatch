"use client";

import { useCallback, useRef, useState } from "react";
import type { AssessmentResult, AnnotatedPhrase } from "@/app/api/speaking/assess/route";
import { addNotebookEntry } from "@/lib/notebook-storage";

// ─── "Add to notebook" button ─────────────────────────────────────────────────

function NotebookBtn({ content }: { content: string }) {
  const [state, setState] = useState<"idle" | "done">("idle");

  function handleClick() {
    addNotebookEntry({
      categoryName: "Speaking",
      kind: content.toLowerCase().includes("grammar") ? "Grammar point" : "Vocabulary",
      term: content.split("—")[0]?.trim() || "Speaking note",
      meaning: "",
      explanation: content,
      personalNotes: "",
      source: "speaking-feedback",
    });
    setState("done");
    setTimeout(() => setState("idle"), 2400);
  }

  return (
    <button type="button" className="sp-nb-btn" onClick={handleClick} aria-label="Add to notebook">
      {state === "done" ? (
        <span className="sp-nb-added">✓ Added — don&apos;t forget to study it later!</span>
      ) : (
        "＋ Notebook"
      )}
    </button>
  );
}

// ─── Colour config ────────────────────────────────────────────────────────────

const ANN_COLORS: Record<AnnotatedPhrase["category"], { bg: string; border: string; label: string }> = {
  grammar: { bg: "#fee2e2", border: "#ef4444", label: "Grammar" },
  vocabulary: { bg: "#dbeafe", border: "#3b82f6", label: "Vocabulary" },
  pronunciation: { bg: "#fef9c3", border: "#ca8a04", label: "Pronunciation" },
  coherence: { bg: "#dcfce7", border: "#16a34a", label: "Coherence" },
};

// ─── Annotated transcript renderer ───────────────────────────────────────────

function AnnotatedTranscript({
  text,
  annotations,
}: {
  text: string;
  annotations: AnnotatedPhrase[];
}) {
  const [activeId, setActiveId] = useState<number | null>(null);

  // Build highlight map: find first occurrence of each phrase
  type Segment = { start: number; end: number; ann: AnnotatedPhrase; idx: number };
  const segments: Segment[] = [];
  const usedRanges: [number, number][] = [];

  annotations.forEach((ann, idx) => {
    const pos = text.indexOf(ann.phrase);
    if (pos === -1) return;
    const end = pos + ann.phrase.length;
    const overlaps = usedRanges.some(([s, e]) => pos < e && end > s);
    if (overlaps) return;
    usedRanges.push([pos, end]);
    segments.push({ start: pos, end, ann, idx });
  });

  segments.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const seg of segments) {
    if (seg.start > cursor) {
      parts.push(<span key={`t-${cursor}`}>{text.slice(cursor, seg.start)}</span>);
    }
    const cfg = ANN_COLORS[seg.ann.category];
    const isActive = activeId === seg.idx;
    parts.push(
      <span key={`a-${seg.idx}`} className="sp-ann-anchor">
        <mark
          className="sp-ann-mark"
          style={{ background: cfg.bg, borderBottomColor: cfg.border }}
          onClick={() => setActiveId(isActive ? null : seg.idx)}
          title={`${cfg.label}: ${seg.ann.issue}`}
        >
          {text.slice(seg.start, seg.end)}
        </mark>
        {isActive && (
          <span className="sp-ann-tooltip" style={{ borderColor: cfg.border }}>
            <span className="sp-ann-tooltip-cat" style={{ color: cfg.border }}>{cfg.label}</span>
            <span className="sp-ann-tooltip-issue">{seg.ann.issue}</span>
            {seg.ann.correction && (
              <span className="sp-ann-tooltip-fix">→ {seg.ann.correction}</span>
            )}
            <NotebookBtn content={`[${cfg.label}] "${seg.ann.phrase}" — ${seg.ann.issue}. ${seg.ann.correction ? `Correction: ${seg.ann.correction}` : ""}`} />
          </span>
        )}
      </span>,
    );
    cursor = seg.end;
  }

  if (cursor < text.length) {
    parts.push(<span key="t-end">{text.slice(cursor)}</span>);
  }

  return (
    <div className="sp-annotated-transcript">
      {/* Legend */}
      <div className="sp-ann-legend">
        {(Object.keys(ANN_COLORS) as AnnotatedPhrase["category"][]).map((cat) => {
          const cfg = ANN_COLORS[cat];
          const hasAny = annotations.some((a) => a.category === cat);
          if (!hasAny) return null;
          return (
            <span key={cat} className="sp-ann-legend-item">
              <span className="sp-ann-legend-dot" style={{ background: cfg.bg, borderColor: cfg.border }} />
              {cfg.label}
            </span>
          );
        })}
        <span className="sp-ann-legend-hint">Click a highlight for details</span>
      </div>
      <p className="sp-transcript-text">{parts}</p>
    </div>
  );
}

// ─── Criterion section ────────────────────────────────────────────────────────

function CriterionSection({
  label,
  labelTh,
  detail,
  color,
}: {
  label: string;
  labelTh: string;
  detail: AssessmentResult["fluency"];
  color: string;
}) {
  return (
    <div className="sp-criterion-section" style={{ borderLeftColor: color }}>
      {/* Score row */}
      <div className="sp-criterion-header">
        <div>
          <p className="sp-criterion-label">{label}</p>
          <p className="sp-criterion-label-th">{labelTh}</p>
        </div>
        <strong className="sp-criterion-score" style={{ color }}>
          {detail.score.toFixed(1)}
        </strong>
      </div>

      {/* Bilingual summary */}
      <p className="sp-criterion-summary-en">{detail.scoreEn}</p>
      <p className="sp-criterion-summary-th">{detail.scoreTh}</p>

      {/* Why bullets */}
      {detail.whyBullets.length > 0 && (
        <div className="sp-criterion-sub">
          <p className="sp-criterion-sub-title">Why this score</p>
          <ul className="sp-bullet-list">
            {detail.whyBullets.map((b, i) => (
              <li key={i} className="sp-bullet-item">
                <span>{b}</span>
                <NotebookBtn content={`[${label} score ${detail.score}] ${b}`} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improve bullets */}
      {detail.improveBullets.length > 0 && (
        <div className="sp-criterion-sub">
          <p className="sp-criterion-sub-title">To improve</p>
          <ul className="sp-bullet-list">
            {detail.improveBullets.map((b, i) => {
              // Format: "EXACT PHRASE → correction"
              const [phrase, correction] = b.split("→").map((s) => s.trim());
              return (
                <li key={i} className="sp-bullet-item sp-bullet-improve">
                  <span>
                    <s className="sp-improve-phrase">{phrase}</s>
                    {correction && <> → {correction}</>}
                  </span>
                  <NotebookBtn content={`[${label}] ${b}`} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Improved script ──────────────────────────────────────────────────────────

function ImprovedScript({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const readAloud = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.88;
    utter.onend = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }, [speaking, text]);

  return (
    <div className="sp-improved-script">
      <div className="sp-improved-header">
        <div>
          <p className="sp-improved-kicker">Improved script</p>
          <p className="sp-improved-note">Grammar corrected · Spoken register · No dramatic vocabulary changes</p>
        </div>
        <div className="sp-improved-actions">
          <button type="button" className="sp-improved-read-btn" onClick={readAloud}>
            {speaking ? "⏹ Stop" : "▶ Read aloud"}
          </button>
          <NotebookBtn content={`[Improved script] ${text}`} />
        </div>
      </div>
      <p className="sp-improved-text">{text}</p>
    </div>
  );
}

// ─── Overall score banner ─────────────────────────────────────────────────────

function OverallBanner({ result }: { result: AssessmentResult }) {
  const CRITERIA: { key: keyof AssessmentResult; label: string; color: string }[] = [
    { key: "fluency", label: "Fluency", color: "#1d4ed8" },
    { key: "vocabulary", label: "Vocabulary", color: "#0891b2" },
    { key: "grammar", label: "Grammar", color: "#dc2626" },
    { key: "pronunciation", label: "Pronunciation", color: "#ca8a04" },
  ];

  return (
    <div className="sp-overall-banner">
      <div className="sp-overall-left">
        <span className="sp-overall-label">Overall Band Score</span>
        <strong className="sp-overall-score">{result.overall.toFixed(1)}</strong>
        <p className="sp-overall-en">{result.overallEn}</p>
        <p className="sp-overall-th">{result.overallTh}</p>
      </div>
      <div className="sp-overall-right">
        {CRITERIA.map(({ key, label, color }) => {
          const criterion = result[key] as AssessmentResult["fluency"];
          return (
            <div key={key} className="sp-overall-criterion-row">
              <span className="sp-overall-criterion-label">{label}</span>
              <div className="sp-overall-bar-wrap">
                <div
                  className="sp-overall-bar"
                  style={{ width: `${(criterion.score / 9) * 100}%`, background: color }}
                />
              </div>
              <span className="sp-overall-criterion-score" style={{ color }}>{criterion.score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function SpeakingAssessmentReport({
  question,
  transcript,
  mode,
}: {
  question: string;
  transcript: string;
  mode: "part-1" | "part-3";
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function assess() {
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/speaking/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transcript, mode }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Assessment failed");
      }
      const data = (await res.json()) as AssessmentResult;
      setResult(data);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  if (!transcript.trim()) return null;

  if (state === "idle") {
    return (
      <div className="sp-assess-trigger">
        <button type="button" className="sp-assess-trigger-btn" onClick={assess}>
          ✦ Get Personalized Feedback from English Plan&apos;s 6 Years of Database
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="sp-assess-loading">
        <span className="sp-assess-spinner" aria-hidden="true" />
        Analysing your response with English Plan&apos;s speaking feedback engine…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="sp-assess-error">
        <strong>Assessment unavailable</strong>
        <p>{errorMsg}</p>
        <button type="button" className="sp-assess-trigger-btn" onClick={assess}>Retry</button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="sp-report">
      {/* Overall */}
      <OverallBanner result={result} />

      {/* Annotated transcript */}
      <div className="sp-report-section">
        <h3 className="sp-report-section-title">Your Answer (annotated)</h3>
        <AnnotatedTranscript
          text={result.punctuatedTranscript}
          annotations={result.annotations}
        />
      </div>

      {/* Criteria */}
      <div className="sp-report-section">
        <h3 className="sp-report-section-title">Detailed Feedback</h3>
        <div className="sp-criteria-stack">
          <CriterionSection
            label="Fluency & Coherence"
            labelTh="ความคล่องแคล่วและความสอดคล้อง"
            detail={result.fluency}
            color="#1d4ed8"
          />
          <CriterionSection
            label="Lexical Resource"
            labelTh="คลังคำศัพท์"
            detail={result.vocabulary}
            color="#0891b2"
          />
          <CriterionSection
            label="Grammatical Range & Accuracy"
            labelTh="ไวยากรณ์"
            detail={result.grammar}
            color="#dc2626"
          />
          <CriterionSection
            label="Pronunciation"
            labelTh="การออกเสียง"
            detail={result.pronunciation}
            color="#ca8a04"
          />
        </div>
      </div>

      {/* Improved script */}
      {result.improvedScript && (
        <div className="sp-report-section">
          <h3 className="sp-report-section-title">Improved Script</h3>
          <ImprovedScript text={result.improvedScript} />
        </div>
      )}

      {/* Re-assess */}
      <button type="button" className="sp-reassess-btn" onClick={assess}>
        ↺ Re-assess
      </button>
    </div>
  );
}
