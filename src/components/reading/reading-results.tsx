"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReadingTest, ReadingQuestion } from "@/lib/reading-demo";
import { getAllQuestions, scoreAttempt } from "@/lib/reading-demo";

type StoredResult = {
  testId: string;
  answers: Record<string, string>;
  score: { correct: number; total: number; byQuestion: Record<string, boolean> };
  submittedAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  "fill-in-blank": "Fill in blank",
  "multiple-choice": "Multiple choice",
  "matching-heading": "Match heading",
  "matching-information": "Match info",
};

function displayQuestionType(question: ReadingQuestion) {
  return question.sourceType
    ? question.sourceType.toLowerCase().replaceAll("_", " ")
    : TYPE_LABELS[question.type];
}

function bandEstimate(correct: number, total: number): string {
  const pct = correct / total;
  if (pct >= 0.9) return "8.5–9.0";
  if (pct >= 0.8) return "7.5–8.0";
  if (pct >= 0.7) return "6.5–7.0";
  if (pct >= 0.55) return "5.5–6.0";
  return "≤5.0";
}

export function ReadingResults({ test }: { test: ReadingTest }) {
  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const raw = sessionStorage.getItem(`reading-result-${test.id}`);
      if (raw) {
        try {
          setResult(JSON.parse(raw) as StoredResult);
        } catch {
          // ignore
        }
      }
      setLoaded(true);
    });
  }, [test.id]);

  const allQuestions = getAllQuestions(test);

  // If no result in sessionStorage, show a fallback with demo answers
  const score =
    result?.score ??
    scoreAttempt(
      test,
      allQuestions.map((q) => ({ questionId: q.id, value: "" })),
    );

  const answers: Record<string, string> = result?.answers ?? {};

  if (!loaded) return null;

  return (
    <div className="reading-results-shell stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>
          <Link href="/reading">Reading</Link> /{" "}
        </span>
        <span>
          <Link href={`/reading/sets/${test.id}`}>{test.title}</Link> /{" "}
        </span>
        <span>Results</span>
      </nav>

      <div className="section-header">
        <h2>Your results</h2>
        <p>{test.title}</p>
      </div>

      {/* Score tiles */}
      <div className="reading-score-hero">
        <div className={`reading-score-tile${score.correct / score.total >= 0.6 ? " reading-score-tile-pass" : " reading-score-tile-warn"}`}>
          <span>Score</span>
          <strong>
            {score.correct}/{score.total}
          </strong>
        </div>
        <div className="reading-score-tile">
          <span>Accuracy</span>
          <strong>{Math.round((score.correct / score.total) * 100)}%</strong>
        </div>
        <div className="reading-score-tile">
          <span>Band estimate</span>
          <strong>{bandEstimate(score.correct, score.total)}</strong>
        </div>
        <div className="reading-score-tile">
          <span>Questions</span>
          <strong>{score.total}</strong>
        </div>
      </div>

      {/* Question by question breakdown */}
      <div className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Answer review</p>
            <h3>Question breakdown</h3>
          </div>
        </div>

        <div className="reading-results-list">
          {allQuestions.map((q: ReadingQuestion) => {
            const isCorrect = score.byQuestion[q.id] ?? false;
            const given = answers[q.id] ?? "";

            return (
              <div
                key={q.id}
                className={`reading-result-row${isCorrect ? " reading-result-correct" : " reading-result-wrong"}`}
              >
                <div className="reading-result-num">{q.number}</div>

                <div className="reading-result-body">
                  <p>{q.text}</p>
                  <small>{displayQuestionType(q)}</small>
                  <small>
                    Your answer:{" "}
                    <strong>{given.trim() || <em>— not answered —</em>}</strong>
                  </small>
                  {!isCorrect && (
                    <small>
                      Correct answer: <strong>{q.correctAnswer}</strong>
                    </small>
                  )}
                  {!isCorrect && (
                    <div className="reading-explanation">{q.explanation}</div>
                  )}
                  {!isCorrect && q.thaiExplanation && (
                    <div className="reading-explanation">
                      <strong>Thai explanation:</strong> {q.thaiExplanation}
                    </div>
                  )}
                  {!isCorrect && q.evidence && (
                    <div className="reading-explanation">
                      <strong>Evidence:</strong> {q.evidence}
                    </div>
                  )}
                  {!isCorrect && q.paraphraseLinks?.length ? (
                    <div className="reading-explanation">
                      <strong>Paraphrase links:</strong>
                      {q.paraphraseLinks.map((link, index) => (
                        <div key={`${q.id}-paraphrase-${index}`}>
                          Q: {link.question} / P: {link.passage}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <span
                  className={`reading-result-verdict${isCorrect ? " reading-result-verdict-correct" : " reading-result-verdict-wrong"}`}
                >
                  {isCorrect ? "Correct" : "Wrong"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href={`/reading/sets/${test.id}`} className="action-button">
          Try again
        </Link>
        <Link href="/reading" className="action-button action-button-primary">
          Back to reading
        </Link>
      </div>
    </div>
  );
}
