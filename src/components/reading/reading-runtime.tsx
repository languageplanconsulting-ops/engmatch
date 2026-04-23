"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ReadingResults } from "@/components/reading/reading-results";
import { ReadingWorkspace } from "@/components/reading/reading-workspace";
import {
  READING_IMPORTED_TESTS_STORAGE_KEY,
  getReadingTest,
  readingEntryCards,
  type ReadingImportedTestPackage,
  type ReadingTest,
} from "@/lib/reading-demo";

function readImportedPackages() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(READING_IMPORTED_TESTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReadingImportedTestPackage[];
  } catch {
    return [];
  }
}

type ReadingResultSummary = {
  score?: { correct: number; total: number };
};

function readScorePct(testId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`reading-result-${testId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReadingResultSummary;
    const correct = parsed.score?.correct ?? 0;
    const total = parsed.score?.total ?? 0;
    if (total <= 0) return null;
    return Math.round((correct / total) * 100);
  } catch {
    return null;
  }
}

function useImportedReadingPackages() {
  const [packages, setPackages] = useState<ReadingImportedTestPackage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setPackages(readImportedPackages());
      setLoaded(true);
    });
  }, []);

  return { packages, loaded };
}

function ReadingUnavailable({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>
          <Link href="/reading">Reading</Link> /{" "}
        </span>
        <span>{title}</span>
      </nav>

      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Reading set</p>
            <h2>{title}</h2>
          </div>
        </div>
        <p>{body}</p>
        <div className="workspace-actions">
          <Link href="/reading" className="action-button action-button-primary">
            Back to reading
          </Link>
          <Link href="/admin/reading" className="action-button">
            Open reading admin
          </Link>
        </div>
      </article>
    </div>
  );
}

function resolveImportedTest(
  setId: string,
  importedPackages: ReadingImportedTestPackage[],
) {
  return importedPackages.find(
    (item) => item.test.id === setId || item.id === setId,
  );
}

export function ReadingLibraryClient() {
  const { packages } = useImportedReadingPackages();
  const [scoreByTestId, setScoreByTestId] = useState<Record<string, number | null>>({});

  const readyImports = useMemo(
    () =>
      packages.filter((item) => item.missingPassageIds.length === 0),
    [packages],
  );

  const builtInPassages = useMemo(
    () => readingEntryCards.filter((card) => card.id !== "rs-full-test-1"),
    [],
  );

  const importedPassages = useMemo(
    () =>
      readyImports
        .filter((item) => item.test.type === "passage")
        .map((item) => {
          const passage = item.test.passages[0];
          const slot =
            item.passageSlots?.[passage?.id ?? ""] ??
            item.test.passageNumber ??
            1;
          return {
            id: item.test.id,
            label: `Passage ${slot}`,
            slot,
            title: passage?.title ?? item.test.title,
            level: item.test.level,
            time: `${item.test.timeLimit} min`,
            questions: item.test.passages.flatMap((p) => p.questions).length,
          };
        }),
    [readyImports],
  );

  const guidedBySlot = useMemo(() => {
    const grouped: Record<number, Array<{
      id: string;
      title: string;
      level: string;
      time: string;
      questions: number;
      builtIn?: boolean;
    }>> = { 1: [], 2: [], 3: [] };

    builtInPassages.forEach((card, index) => {
      grouped[index + 1] = grouped[index + 1] ?? [];
      grouped[index + 1].push({
        id: card.id,
        title: card.description,
        level: card.level,
        time: card.time,
        questions: card.questions,
        builtIn: true,
      });
    });

    importedPassages.forEach((item) => {
      grouped[item.slot] = grouped[item.slot] ?? [];
      grouped[item.slot].push({
        id: item.id,
        title: item.title,
        level: item.level,
        time: item.time,
        questions: item.questions,
      });
    });

    return grouped;
  }, [builtInPassages, importedPassages]);

  const fullTestCards = useMemo(() => {
    const cards: Array<{
      id: string;
      label: string;
      description: string;
      level: string;
      time: string;
      questions: number;
    }> = [readingEntryCards.find((card) => card.id === "rs-full-test-1")]
      .filter(Boolean)
      .map((card) => ({
        id: card!.id,
        label: card!.label,
        description: card!.description,
        level: card!.level,
        time: card!.time,
        questions: card!.questions,
      }));

    readyImports
      .filter((item) => item.test.type === "full")
      .forEach((item) => {
        cards.push({
          id: item.test.id,
          label: "Full Test",
          description: item.test.title,
          level: item.test.level,
          time: `${item.test.timeLimit} min`,
          questions: item.test.passages.flatMap((p) => p.questions).length,
        });
      });

    return cards;
  }, [readyImports]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const testIds = [
      ...builtInPassages.map((card) => card.id),
      ...importedPassages.map((card) => card.id),
      ...fullTestCards.map((card) => card.id),
    ];
    const next: Record<string, number | null> = {};
    testIds.forEach((id) => {
      next[id] = readScorePct(id);
    });
    setScoreByTestId(next);
  }, [builtInPassages, importedPassages, fullTestCards]);

  return (
    <div className="stack-lg">
      <div className="section-header">
        <h2>Guided Practice Mode</h2>
        <p>
          Hint + helper support, one passage at a time, with bilingual Thai and English support.
        </p>
      </div>

      <div className="stack-md">
        {[1, 2, 3].map((slot) => (
          <details key={`slot-${slot}`} className="reading-slot-block" open>
            <summary className="reading-slot-summary">
              Passage {slot}
            </summary>
            <div className="reading-slot-list">
              {(guidedBySlot[slot] ?? []).map((entry) => {
                const score = scoreByTestId[entry.id];
                return (
                  <div key={entry.id} className="reading-slot-item">
                    <div>
                      <p className="reading-slot-item-title">{entry.title}</p>
                      <div className="reading-entry-meta">
                        <span className="reading-entry-chip">{entry.level}</span>
                        <span className="reading-entry-chip">{entry.time}</span>
                        <span className="reading-entry-chip">{entry.questions} questions</span>
                        {score !== null && score !== undefined ? (
                          <span className="reading-entry-chip">{score}%</span>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      href={`/reading/sets/${entry.id}`}
                      className="action-button action-button-primary"
                    >
                      {score !== null && score !== undefined ? "Review" : "Start"}
                    </Link>
                  </div>
                );
              })}
              {(guidedBySlot[slot] ?? []).length === 0 && (
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  No passage assigned yet.
                </p>
              )}
            </div>
          </details>
        ))}
      </div>

      <div className="section-header">
        <h2>Real Mock Test</h2>
        <p>No hint during test. Explanation is available for every wrong answer after submission.</p>
      </div>

      <div className="reading-entry-grid">
        {fullTestCards.map((card) => (
          <Link
            key={card.id}
            href={`/reading/sets/${card.id}`}
            className="reading-entry-card reading-entry-card-full"
          >
            <span className="reading-entry-label">{card.label}</span>
            <h3 className="reading-entry-title">{card.description}</h3>
            <div className="reading-entry-meta">
              <span className="reading-entry-chip">{card.level}</span>
              <span className="reading-entry-chip">{card.time}</span>
              <span className="reading-entry-chip">{card.questions} questions</span>
              {scoreByTestId[card.id] !== null && scoreByTestId[card.id] !== undefined ? (
                <span className="reading-entry-chip">{scoreByTestId[card.id]}%</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}

export function ReadingSetRuntime({ setId }: { setId: string }) {
  const builtInTest = getReadingTest(setId);
  const { packages, loaded } = useImportedReadingPackages();

  const importedPackage = useMemo(
    () => resolveImportedTest(setId, packages),
    [packages, setId],
  );

  if (builtInTest) {
    return <ReadingWorkspace test={builtInTest} />;
  }

  if (!loaded) {
    return <ReadingUnavailable title="Loading imported test" body="Checking imported reading sets in this browser…" />;
  }

  if (!importedPackage) {
    return (
      <ReadingUnavailable
        title="Reading set not found"
        body="This reading set does not exist in the seeded library or your imported reading packages."
      />
    );
  }

  if (importedPackage.missingPassageIds.length > 0) {
    return (
      <ReadingUnavailable
        title={importedPackage.test.title}
        body={`This imported set is not ready yet. Passage text is still missing for: ${importedPackage.missingPassageIds.join(", ")}.`}
      />
    );
  }

  return <ReadingWorkspace test={importedPackage.test as ReadingTest} />;
}

export function ReadingResultsRuntime({ setId }: { setId: string }) {
  const builtInTest = getReadingTest(setId);
  const { packages, loaded } = useImportedReadingPackages();

  const importedPackage = useMemo(
    () => resolveImportedTest(setId, packages),
    [packages, setId],
  );

  if (builtInTest) {
    return <ReadingResults test={builtInTest} />;
  }

  if (!loaded) {
    return <ReadingUnavailable title="Loading results" body="Checking imported reading sets in this browser…" />;
  }

  if (!importedPackage || importedPackage.missingPassageIds.length > 0) {
    return (
      <ReadingUnavailable
        title="Results unavailable"
        body="This imported reading set is not available for review yet in this browser."
      />
    );
  }

  return <ReadingResults test={importedPackage.test as ReadingTest} />;
}
