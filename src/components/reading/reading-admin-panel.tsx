"use client";

import { useEffect, useMemo, useState } from "react";
import {
  READING_IMPORTED_TESTS_STORAGE_KEY,
  buildReadingImportedPackage,
  parseReadingAnswerKeyUpload,
  readingSeparateAnswerKeyTemplate,
  readingSeparatePassageTemplate,
  readingTests,
  type ReadingAnswerKeyUpload,
  type ReadingImportedTestPackage,
  type ReadingPassageDraft,
} from "@/lib/reading-demo";

const ANSWER_KEY_STORAGE = "engmatch-reading-answer-key-v2";
const PASSAGE_DRAFTS_STORAGE = "engmatch-reading-passage-drafts-v2";

function readStoredJson<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeImportedSlots(item: ReadingImportedTestPackage) {
  const existing = item.passageSlots ?? {};
  const nextSlots: Record<string, number> = {};
  item.test.passages.forEach((passage, index) => {
    nextSlots[passage.id] = existing[passage.id] ?? index + 1;
  });
  return nextSlots;
}

export function ReadingAdminPanel() {
  const [answerKeyText, setAnswerKeyText] = useState(readingSeparateAnswerKeyTemplate);
  const [answerKey, setAnswerKey] = useState<ReadingAnswerKeyUpload | null>(null);
  const [answerKeyError, setAnswerKeyError] = useState<string | null>(null);
  const [answerKeyStatus, setAnswerKeyStatus] = useState<"idle" | "ok" | "error">("idle");
  const [passageDrafts, setPassageDrafts] = useState<Record<number, ReadingPassageDraft>>({});
  const [selectedPassageId, setSelectedPassageId] = useState<number | null>(null);
  const [mergedImports, setMergedImports] = useState<ReadingImportedTestPackage[]>([]);
  const [copiedState, setCopiedState] = useState<"answer" | "passage" | "merged" | null>(null);
  const [mergeSaved, setMergeSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const storedAnswerKey = readStoredJson<string>(
        ANSWER_KEY_STORAGE,
        readingSeparateAnswerKeyTemplate,
      );
      const storedDrafts = readStoredJson<Record<number, ReadingPassageDraft>>(
        PASSAGE_DRAFTS_STORAGE,
        {},
      );
      const storedImports = readStoredJson<ReadingImportedTestPackage[]>(
        READING_IMPORTED_TESTS_STORAGE_KEY,
        [],
      );

      setAnswerKeyText(storedAnswerKey);
      setPassageDrafts(storedDrafts);
      setMergedImports(
        storedImports.map((item) => ({
          ...item,
          passageSlots: normalizeImportedSlots(item),
        })),
      );

      const parsed = parseReadingAnswerKeyUpload(storedAnswerKey);
      if (parsed.data) {
        setAnswerKey(parsed.data);
        setAnswerKeyStatus("ok");
        setSelectedPassageId(parsed.data.passages[0]?.passage_id ?? null);
      }

      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(ANSWER_KEY_STORAGE, answerKeyText);
  }, [answerKeyText, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(PASSAGE_DRAFTS_STORAGE, JSON.stringify(passageDrafts));
  }, [passageDrafts, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      READING_IMPORTED_TESTS_STORAGE_KEY,
      JSON.stringify(mergedImports),
    );
  }, [mergedImports, hydrated]);

  const selectedPassage = useMemo(
    () =>
      answerKey?.passages.find(
        (passage) =>
          passage.passage_id ===
          (selectedPassageId ?? answerKey.passages[0]?.passage_id ?? null),
      ) ?? null,
    [answerKey, selectedPassageId],
  );

  const mergedPackage = useMemo(
    () => (answerKey ? buildReadingImportedPackage(answerKey, passageDrafts) : null),
    [answerKey, passageDrafts],
  );

  const mergedJson = useMemo(
    () => (mergedPackage ? JSON.stringify(mergedPackage, null, 2) : ""),
    [mergedPackage],
  );

  const inferredHintCount = useMemo(() => {
    if (!mergedPackage) return 0;
    return mergedPackage.test.passages
      .flatMap((passage) => passage.questions)
      .filter((question) => question.hint.end > question.hint.start)
      .length;
  }, [mergedPackage]);

  async function copyText(value: string, kind: "answer" | "passage" | "merged") {
    await navigator.clipboard.writeText(value);
    setCopiedState(kind);
    setTimeout(() => setCopiedState(null), 1800);
  }

  function handleValidateAnswerKey() {
    const parsed = parseReadingAnswerKeyUpload(answerKeyText);
    if (!parsed.data) {
      setAnswerKey(null);
      setAnswerKeyStatus("error");
      setAnswerKeyError(parsed.error ?? "Invalid answer-key JSON.");
      return;
    }

    const validData = parsed.data;
    setAnswerKey(validData);
    setAnswerKeyStatus("ok");
    setAnswerKeyError(null);
    setSelectedPassageId((current) => current ?? validData.passages[0]?.passage_id ?? null);
    setPassageDrafts((previous) => {
      const next = { ...previous };
      for (const passage of validData.passages) {
        next[passage.passage_id] = next[passage.passage_id] ?? {
          passage_id: passage.passage_id,
          title: passage.title,
          text: "",
        };
      }
      return next;
    });
  }

  function updateSelectedPassageDraft(field: "title" | "text", value: string) {
    if (!selectedPassage) return;

    setPassageDrafts((previous) => ({
      ...previous,
      [selectedPassage.passage_id]: {
        passage_id: selectedPassage.passage_id,
        title:
          field === "title"
            ? value
            : previous[selectedPassage.passage_id]?.title ?? selectedPassage.title,
        text:
          field === "text"
            ? value
            : previous[selectedPassage.passage_id]?.text ?? "",
      },
    }));
  }

  function handleSaveMergedPackage() {
    if (!mergedPackage) return;

    setMergedImports((previous) => [
      {
        ...mergedPackage,
        passageSlots: normalizeImportedSlots(mergedPackage),
      },
      ...previous.filter((item) => item.id !== mergedPackage.id),
    ]);
    setMergeSaved(true);
    setTimeout(() => setMergeSaved(false), 1800);
  }

  function handleResetDrafts() {
    setAnswerKeyText(readingSeparateAnswerKeyTemplate);
    setAnswerKey(null);
    setAnswerKeyStatus("idle");
    setAnswerKeyError(null);
    setPassageDrafts({});
    setSelectedPassageId(null);
    setMergeSaved(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ANSWER_KEY_STORAGE);
      window.localStorage.removeItem(PASSAGE_DRAFTS_STORAGE);
    }
  }

  function updateImportedPassageSlot(
    importId: string,
    passageId: string,
    slot: number,
  ) {
    setMergedImports((previous) =>
      previous.map((item) => {
        if (item.id !== importId) return item;
        const nextSlots = {
          ...normalizeImportedSlots(item),
          [passageId]: slot,
        };

        const sortedPassages = [...item.test.passages].sort(
          (a, b) => (nextSlots[a.id] ?? 999) - (nextSlots[b.id] ?? 999),
        );

        const rebuiltTest =
          item.test.type === "passage"
            ? {
                ...item.test,
                passageNumber: (slot <= 1 ? 1 : slot === 2 ? 2 : 3) as 1 | 2 | 3,
                passages: sortedPassages,
              }
            : {
                ...item.test,
                passages: sortedPassages,
              };

        return {
          ...item,
          test: rebuiltTest,
          passageSlots: nextSlots,
        };
      }),
    );
  }

  const selectedDraft = selectedPassage
    ? passageDrafts[selectedPassage.passage_id] ?? {
        passage_id: selectedPassage.passage_id,
        title: selectedPassage.title,
        text: "",
      }
    : null;

  return (
    <section className="reading-admin-grid">
      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Content bank</p>
            <h2>Published + imported tests</h2>
          </div>
        </div>

        <div className="prompt-bank">
          {readingTests.map((test) => (
            <article key={test.id} className="prompt-bank-card">
              <div className="prompt-bank-meta">
                <span>{test.type === "full" ? "Full test" : `Passage ${test.passageNumber}`}</span>
                <span>{test.level}</span>
              </div>
              <h4>{test.title}</h4>
              <div className="status-chip-row">
                <span className="status-chip">{test.timeLimit} min</span>
                <span className="status-chip">
                  {test.passages.flatMap((passage) => passage.questions).length} questions
                </span>
              </div>
            </article>
          ))}

          {mergedImports.map((item) => (
            <article key={item.id} className="prompt-bank-card reading-import-card">
              <div className="prompt-bank-meta">
                <span>Date uploaded</span>
                <span>{new Date(item.importedAt).toLocaleDateString("en-GB")}</span>
              </div>
              <h4>{item.test.title}</h4>
              <div className="status-chip-row">
                <span className="status-chip">{item.test.passages.length} passages</span>
                <span className="status-chip">
                  {item.test.passages.flatMap((passage) => passage.questions).length} questions
                </span>
                {item.missingPassageIds.length > 0 && (
                  <span className="status-chip">Missing passages: {item.missingPassageIds.join(", ")}</span>
                )}
              </div>

              <div className="stack-sm" style={{ marginTop: 10 }}>
                <p className="panel-kicker" style={{ margin: 0 }}>
                  Passage placement (Practice + Mock)
                </p>
                {item.test.passages.map((passage, index) => {
                  const currentSlot =
                    item.passageSlots?.[passage.id] ??
                    (item.test.type === "passage"
                      ? (item.test.passageNumber ?? 1)
                      : index + 1);
                  const maxSlot = Math.max(3, item.test.passages.length);
                  return (
                    <label key={`${item.id}-${passage.id}`} className="field-block" style={{ marginBottom: 0 }}>
                      <span>{passage.title}</span>
                      <select
                        value={currentSlot}
                        onChange={(event) =>
                          updateImportedPassageSlot(
                            item.id,
                            passage.id,
                            Number(event.target.value),
                          )
                        }
                      >
                        {Array.from({ length: maxSlot }, (_, slotIndex) => slotIndex + 1).map(
                          (slotValue) => (
                            <option key={slotValue} value={slotValue}>
                              Passage {slotValue}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Step 1</p>
            <h3>Paste answer-key JSON</h3>
          </div>
        </div>

        <div className="upload-note">
          <strong>Separate upload flow</strong>
          <p>
            Paste the answer key first. The admin panel will create a passage bank so you can paste
            each full passage text later, then auto-merge everything into one reading package.
          </p>
        </div>

        <label className="field-block">
          <span>Answer-key JSON</span>
          <textarea
            className="writing-textarea reading-json-textarea"
            value={answerKeyText}
            onChange={(event) => {
              setAnswerKeyText(event.target.value);
              setAnswerKeyStatus("idle");
              setAnswerKeyError(null);
            }}
            spellCheck={false}
          />
        </label>

        {answerKeyStatus === "ok" && answerKey && (
          <div className="status-banner">
            <strong>Answer key valid</strong>
            <p>
              {answerKey.passages.length} passages detected. You can now paste each passage text
              separately below.
            </p>
          </div>
        )}

        {answerKeyStatus === "error" && (
          <div
            className="status-banner"
            style={{ background: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
          >
            <strong>Answer key invalid</strong>
            <p>{answerKeyError}</p>
          </div>
        )}

        <div className="workspace-actions">
          <button type="button" className="action-button" onClick={() => copyText(readingSeparateAnswerKeyTemplate, "answer")}>
            {copiedState === "answer" ? "Copied!" : "Copy answer-key template"}
          </button>
          <button
            type="button"
            className="action-button action-button-primary"
            onClick={handleValidateAnswerKey}
          >
            Validate answer key
          </button>
        </div>
      </article>

      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Step 2</p>
            <h3>Passage bank</h3>
          </div>
        </div>

        {!answerKey ? (
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            Validate the answer key first, then each passage from that upload will appear here so
            you can paste the full text later.
          </p>
        ) : (
          <>
            <div className="reading-passage-bank">
              {answerKey.passages.map((passage) => {
                const hasText = Boolean(passageDrafts[passage.passage_id]?.text?.trim());
                return (
                  <button
                    key={passage.passage_id}
                    type="button"
                    className={`reading-passage-chip${
                      selectedPassageId === passage.passage_id ? " reading-passage-chip-active" : ""
                    }`}
                    onClick={() => setSelectedPassageId(passage.passage_id)}
                  >
                    <span>Passage {passage.passage_id}</span>
                    <strong>{passage.title}</strong>
                    <small>{hasText ? "Text added" : "Waiting for passage text"}</small>
                  </button>
                );
              })}
            </div>

            {selectedPassage && selectedDraft && (
              <div className="stack-md">
                <label className="field-block">
                  <span>Passage title</span>
                  <input
                    value={selectedDraft.title}
                    onChange={(event) => updateSelectedPassageDraft("title", event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span>Passage {selectedPassage.passage_id} text</span>
                  <textarea
                    className="writing-textarea reading-json-textarea"
                    value={selectedDraft.text}
                    onChange={(event) => updateSelectedPassageDraft("text", event.target.value)}
                    placeholder="Paste the full passage text here. This is used to auto-find evidence ranges."
                    spellCheck={false}
                  />
                </label>

                <div className="workspace-actions">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => copyText(readingSeparatePassageTemplate, "passage")}
                  >
                    {copiedState === "passage" ? "Copied!" : "Copy passage template"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </article>

      <article className="panel-shell" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Step 3</p>
            <h3>Merged reading package</h3>
          </div>
        </div>

        {!mergedPackage ? (
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            Add a valid answer key to generate the merged package preview.
          </p>
        ) : (
          <>
            <div className="reading-merge-summary">
              <div className="info-tile">
                <span>Passages ready</span>
                <strong>
                  {mergedPackage.test.passages.length - mergedPackage.missingPassageIds.length}/
                  {mergedPackage.test.passages.length}
                </strong>
              </div>
              <div className="info-tile">
                <span>Question count</span>
                <strong>
                  {mergedPackage.test.passages.flatMap((passage) => passage.questions).length}
                </strong>
              </div>
              <div className="info-tile">
                <span>Auto hint ranges</span>
                <strong>{inferredHintCount}</strong>
              </div>
              <div className="info-tile">
                <span>Raw metadata kept</span>
                <strong>Thai + evidence + paraphrase</strong>
              </div>
            </div>

            {(mergedPackage.missingPassageIds.length > 0 ||
              mergedPackage.unsupportedQuestionNumbers.length > 0) && (
              <div className="upload-note">
                {mergedPackage.missingPassageIds.length > 0 && (
                  <p>
                    Missing passage text for:{" "}
                    <strong>{mergedPackage.missingPassageIds.join(", ")}</strong>
                  </p>
                )}
                {mergedPackage.unsupportedQuestionNumbers.length > 0 && (
                  <p>
                    Some multiple-choice items only have answer letters, so the merge keeps them
                    but may still need the original question sheet later:{" "}
                    <strong>{mergedPackage.unsupportedQuestionNumbers.join(", ")}</strong>
                  </p>
                )}
              </div>
            )}

            <label className="field-block">
              <span>Merged JSON preview</span>
              <textarea
                className="writing-textarea reading-json-preview"
                value={mergedJson}
                readOnly
                spellCheck={false}
              />
            </label>

            {mergeSaved && (
              <div className="status-banner">
                <strong>Merged package saved</strong>
                <p>It is now stored in this browser under the imported tests list above.</p>
              </div>
            )}

            <div className="workspace-actions">
              <button type="button" className="action-button" onClick={() => copyText(mergedJson, "merged")}>
                {copiedState === "merged" ? "Copied!" : "Copy merged JSON"}
              </button>
              <button
                type="button"
                className="action-button action-button-primary"
                onClick={handleSaveMergedPackage}
              >
                Save merged package
              </button>
              <button type="button" className="action-button" onClick={handleResetDrafts}>
                Clear drafts
              </button>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
