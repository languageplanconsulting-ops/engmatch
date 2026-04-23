"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getMergedSpeakingTests,
  getSpeakingModeLabel,
  type SpeakingAnyTest,
  type SpeakingMode,
  type SpeakingTip,
} from "@/lib/speaking-demo";

type Props = { mode: SpeakingMode };

function getQuestions(test: SpeakingAnyTest): { id: string; prompt: string }[] {
  if ("questions" in test) return test.questions;
  if ("question" in test) return [test.question];
  return [...test.part1, test.part2, ...test.part3];
}

function getTips(test: SpeakingAnyTest): SpeakingTip[] {
  if ("tips" in test && Array.isArray(test.tips)) return test.tips as SpeakingTip[];
  return [];
}

const TIP_COLORS: Record<SpeakingTip["type"], { bg: string; color: string }> = {
  grammar: { bg: "#dbeafe", color: "#1d4ed8" },
  vocabulary: { bg: "#dcfce7", color: "#166534" },
  pattern: { bg: "#fef9c3", color: "#854d0e" },
};

function TestCard({ test, mode }: { test: SpeakingAnyTest; mode: SpeakingMode }) {
  const [expanded, setExpanded] = useState(false);
  const questions = getQuestions(test);
  const tips = getTips(test);
  const tipTypes = [...new Set(tips.map((t) => t.type))];

  return (
    <article className="sp-browser-card">
      {/* Card header */}
      <div className="sp-browser-card-top">
        <div>
          <p className="sp-browser-kicker">{getSpeakingModeLabel(mode)} · {test.topic}</p>
          <h3 className="sp-browser-name">{test.name}</h3>
        </div>
        <div className="sp-browser-meta-col">
          <span className="sp-browser-meta-chip">{questions.length} questions</span>
          <span className="sp-browser-meta-chip">{test.uploadedAt}</span>
        </div>
      </div>

      {/* Tips chips */}
      {tipTypes.length > 0 && (
        <div className="sp-browser-tips-row">
          {tipTypes.map((t) => (
            <span
              key={t}
              className="sp-browser-tip-chip"
              style={{ background: TIP_COLORS[t].bg, color: TIP_COLORS[t].color }}
            >
              {t === "grammar" ? "G" : t === "vocabulary" ? "V" : "P"} {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
          <span className="sp-browser-tip-note">tips included</span>
        </div>
      )}

      {/* Preview questions — collapsible */}
      <div className="sp-browser-preview">
        <button
          type="button"
          className="sp-browser-preview-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span>Preview questions</span>
          <span className="sp-browser-toggle-icon">{expanded ? "▲" : "▼"}</span>
        </button>

        {expanded && (
          <ol className="sp-browser-question-list">
            {questions.map((q, i) => (
              <li key={q.id} className="sp-browser-question-item">
                <span className="sp-browser-q-num">{i + 1}</span>
                <span>{q.prompt}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Actions */}
      <div className="sp-browser-actions">
        <Link
          href={`/speaking/${mode}/${test.id}`}
          className="sp-browser-open-btn"
        >
          Open test →
        </Link>
      </div>
    </article>
  );
}

export function SpeakingTestBrowser({ mode }: Props) {
  const [tests, setTests] = useState<SpeakingAnyTest[]>([]);

  useEffect(() => {
    setTests(getMergedSpeakingTests(mode));
  }, [mode]);

  const modeDescriptions: Partial<Record<SpeakingMode, string>> = {
    "part-1": "Short personal questions. Each question gets a 60-second answer. Tips for grammar, vocabulary, and useful patterns are included.",
    "part-2": "One cue card topic. Choose your preparation time, take notes, then speak for up to 2 minutes.",
    "part-3": "Abstract discussion questions linked to Part 2. Develop your ideas with reasoning and examples.",
    "full-test": "A complete simulated IELTS speaking interview combining all three parts.",
  };

  return (
    <section className="sp-browser-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span><Link href="/">Home</Link> / </span>
        <span><Link href="/speaking">Speaking</Link> / </span>
        <span>{getSpeakingModeLabel(mode)}</span>
      </nav>

      <div className="sp-browser-header">
        <h1>{getSpeakingModeLabel(mode)}</h1>
        <p className="sp-browser-desc">{modeDescriptions[mode]}</p>
      </div>

      {tests.length === 0 ? (
        <div className="status-banner">
          <strong>No packs uploaded yet</strong>
          <p>Ask your teacher to upload a speaking pack from the admin panel.</p>
        </div>
      ) : (
        <div className="sp-browser-grid">
          {tests.map((test) => (
            <TestCard key={test.id} test={test} mode={mode} />
          ))}
        </div>
      )}
    </section>
  );
}
