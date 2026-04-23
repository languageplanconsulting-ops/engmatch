"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMergedSpeakingTests,
  readStoredSpeakingUploads,
  speakingUploadTemplates,
  type SpeakingAnyTest,
  type SpeakingMode,
  type SpeakingQuickfireTest,
  upsertStoredSpeakingUpload,
  writeStoredSpeakingUploads,
} from "@/lib/speaking-demo";

type TemplateMode = "part-1" | "part-2" | "part-3";

const TEMPLATE_OPTIONS: { value: TemplateMode; label: string }[] = [
  { value: "part-1", label: "Part 1 speaking" },
  { value: "part-2", label: "Part 2 speaking" },
  { value: "part-3", label: "Part 3 speaking" },
];

type TtsProgress = {
  total: number;
  done: number;
  current: string;
  errors: string[];
};

function isSpeakingAnyTest(value: unknown): value is SpeakingAnyTest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { id?: unknown; mode?: unknown };
  return (
    typeof candidate.id === "string" &&
    (candidate.mode === "part-1" ||
      candidate.mode === "part-2" ||
      candidate.mode === "part-3" ||
      candidate.mode === "full-test")
  );
}

export function SpeakingAdminPanel() {
  const [mode, setMode] = useState<TemplateMode>("part-1");
  const [jsonText, setJsonText] = useState(speakingUploadTemplates["part-1"]);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const [uploadState, setUploadState] = useState<"idle" | "ok" | "error">("idle");
  const [uploadedTest, setUploadedTest] = useState<SpeakingAnyTest | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [ttsProgress, setTtsProgress] = useState<TtsProgress | null>(null);
  const [ttsState, setTtsState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [uploadedPacks, setUploadedPacks] = useState<SpeakingAnyTest[]>([]);

  const [counts, setCounts] = useState<Record<SpeakingMode, number>>(() => ({
    "part-1": getMergedSpeakingTests("part-1").length,
    "part-2": getMergedSpeakingTests("part-2").length,
    "part-3": getMergedSpeakingTests("part-3").length,
    "full-test": getMergedSpeakingTests("full-test").length,
  }));

  const providerInfo = useMemo(
    () => [
      { label: "TTS voice", desc: "Deepgram Aura voice (e.g. aura-asteria-en) stored per pack." },
      { label: "Transcription", desc: "Deepgram Nova-3 model and language stored for student sessions." },
      { label: "Tips", desc: "Grammar, vocabulary, and pattern tips appear in the pre-test popup." },
    ],
    [],
  );

  useEffect(() => {
    setUploadedPacks(readStoredSpeakingUploads());
  }, []);

  function refreshCounts() {
    setCounts({
      "part-1": getMergedSpeakingTests("part-1").length,
      "part-2": getMergedSpeakingTests("part-2").length,
      "part-3": getMergedSpeakingTests("part-3").length,
      "full-test": getMergedSpeakingTests("full-test").length,
    });
  }

  function handleModeChange(nextMode: TemplateMode) {
    setMode(nextMode);
    setJsonText(speakingUploadTemplates[nextMode]);
    setUploadState("idle");
    setUploadedTest(null);
    setUploadedCount(0);
    setUploadMessage("");
    setTtsState("idle");
    setTtsProgress(null);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(speakingUploadTemplates[mode]);
    setCopyState("done");
    setTimeout(() => setCopyState("idle"), 1600);
  }

  function handleUpload() {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const packs = Array.isArray(parsed) ? parsed : [parsed];
      const validPacks = packs.filter(isSpeakingAnyTest);
      if (validPacks.length === 0) {
        throw new Error("No valid speaking packs found");
      }

      validPacks.forEach((pack) => upsertStoredSpeakingUpload(pack));
      setUploadedPacks(readStoredSpeakingUploads());
      setUploadedCount(validPacks.length);
      if (validPacks.length === 1) {
        setUploadedTest(validPacks[0]);
        setUploadMessage("1 pack uploaded. You can generate TTS below.");
      } else {
        setUploadedTest(null);
        setUploadMessage(
          `${validPacks.length} packs uploaded in bulk. TTS generation works per single pack upload.`,
        );
      }
      refreshCounts();
      setUploadState("ok");
      setTtsState("idle");
      setTtsProgress(null);
    } catch {
      setUploadedCount(0);
      setUploadMessage("");
      setUploadState("error");
    }
  }

  function removeUploadedPack(packId: string) {
    const next = readStoredSpeakingUploads().filter((pack) => pack.id !== packId);
    writeStoredSpeakingUploads(next);
    setUploadedPacks(next);
    refreshCounts();
    if (uploadedTest?.id === packId) {
      setUploadedTest(null);
      setUploadState("idle");
      setTtsState("idle");
      setTtsProgress(null);
      setUploadMessage("");
      setUploadedCount(0);
    }
  }

  /** Generate TTS audio for each question in the uploaded pack via Deepgram */
  async function handleGenerateTts() {
    if (!uploadedTest) return;

    // Only quickfire tests (part-1/part-3) and part-2 have questions
    const questions =
      "questions" in uploadedTest
        ? uploadedTest.questions
        : "question" in uploadedTest
          ? [uploadedTest.question]
          : [];

    if (questions.length === 0) return;

    const voice =
      uploadedTest.provider?.ttsVoice ?? "aura-asteria-en";

    setTtsState("running");
    setTtsProgress({ total: questions.length, done: 0, current: questions[0].prompt, errors: [] });

    const updatedQuestions = [...questions];
    const errors: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setTtsProgress({ total: questions.length, done: i, current: q.prompt, errors });

      try {
        const res = await fetch("/api/speaking/tts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: q.ttsText || q.prompt, voice }),
        });

        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          errors.push(`Q${i + 1}: ${j.error ?? "Failed"}`);
          continue;
        }

        const data = (await res.json()) as { audioDataUrl: string };
        updatedQuestions[i] = { ...q, ttsAudioUrl: data.audioDataUrl };
      } catch (err) {
        errors.push(`Q${i + 1}: ${err instanceof Error ? err.message : "Network error"}`);
      }
    }

    // Save updated test back to storage
    let updatedTest: SpeakingAnyTest;
    if ("questions" in uploadedTest) {
      updatedTest = { ...(uploadedTest as SpeakingQuickfireTest), questions: updatedQuestions };
    } else if ("question" in uploadedTest) {
      updatedTest = { ...uploadedTest, question: updatedQuestions[0] };
    } else {
      updatedTest = uploadedTest;
    }

    upsertStoredSpeakingUpload(updatedTest);
    setUploadedTest(updatedTest);
    setTtsProgress({ total: questions.length, done: questions.length, current: "", errors });
    setTtsState(errors.length === 0 ? "done" : "error");
  }

  const questionCount = uploadedTest
    ? "questions" in uploadedTest
      ? uploadedTest.questions.length
      : "question" in uploadedTest
        ? 1
        : 0
    : 0;

  return (
    <section className="speaking-admin-grid">
      {/* ── Left: summary panel ── */}
      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Speaking bank</p>
            <h2>Uploaded packs</h2>
          </div>
        </div>

        <div className="speaking-admin-counts">
          {Object.entries(counts).map(([key, value]) => (
            <article className="metric-card" key={key}>
              <span>{key.replace(/-/g, " ")}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className="upload-note" style={{ marginTop: 16 }}>
          <strong>What gets stored</strong>
          <p>
            Each pack stores the provider config, TTS voice, transcription model, and
            optional pre-generated audio URLs so the student runner plays audio instantly.
          </p>
        </div>

        <div className="speaking-provider-list">
          {providerInfo.map((item) => (
            <div className="info-tile" key={item.label}>
              <strong>{item.label}</strong>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-2)" }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="upload-note" style={{ marginTop: 16 }}>
          <strong>Uploaded packs ({uploadedPacks.length})</strong>
          {uploadedPacks.length === 0 ? (
            <p>No custom packs uploaded yet.</p>
          ) : (
            <div className="stack-sm" style={{ marginTop: 10 }}>
              {uploadedPacks.map((pack) => {
                const count =
                  "questions" in pack
                    ? pack.questions.length
                    : "question" in pack
                      ? 1
                      : 0;
                return (
                  <div
                    key={pack.id}
                    className="info-tile"
                    style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
                  >
                    <div>
                      <strong>{pack.name}</strong>
                      <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-2)" }}>
                        {pack.mode} · {pack.topic} · {count} question{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => removeUploadedPack(pack.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </article>

      {/* ── Right: upload + TTS generate ── */}
      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Bulk upload</p>
            <h3>Paste speaking JSON</h3>
          </div>
        </div>

        <div className="simple-upload-grid">
          <label className="field-block">
            <span>Type of question</span>
            <select
              value={mode}
              onChange={(event) => handleModeChange(event.target.value as TemplateMode)}
            >
              {TEMPLATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field-block">
          <span>JSON</span>
          <small style={{ color: "var(--muted)" }}>
            Supports single pack object or bulk array: [{"{"} ... {"}"}, {"{"} ... {"}"}]
          </small>
          <textarea
            className="writing-textarea"
            style={{ minHeight: 340, fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck={false}
          />
        </label>

        {/* Status banners */}
        {uploadState === "ok" && (
          <div className="status-banner">
            <strong>✓ Pack saved</strong>
            <p>
              {uploadMessage ||
                `${uploadedCount} pack${uploadedCount !== 1 ? "s" : ""} uploaded successfully.`}
            </p>
          </div>
        )}
        {uploadState === "error" && (
          <div className="status-banner" style={{ background: "rgba(239,68,68,0.1)", borderColor: "#ef4444" }}>
            <strong>Invalid JSON</strong>
            <p>Check the structure matches the template before uploading.</p>
          </div>
        )}

        <div className="workspace-actions">
          <button type="button" className="action-button" onClick={handleCopy}>
            {copyState === "done" ? "Copied!" : "Copy template"}
          </button>
          <button
            type="button"
            className="action-button action-button-primary"
            onClick={handleUpload}
          >
            Validate &amp; upload
          </button>
        </div>

        {/* TTS generation section — visible after successful upload */}
        {uploadState === "ok" && uploadedTest && questionCount > 0 && (
          <div className="sp-tts-generate-section">
            <div className="sp-tts-generate-header">
              <div>
                <p className="sp-tts-label">Deepgram TTS</p>
                <strong>Generate question audio</strong>
                <p className="sp-tts-desc">
                  Click to call Deepgram Text-to-Speech for each question. Students will hear
                  the examiner voice instead of browser speech synthesis.
                  Requires <code>DEEPGRAM_API_KEY</code>.
                </p>
              </div>
            </div>

            {/* Progress */}
            {ttsProgress && (
              <div className="sp-tts-progress">
                <div className="sp-tts-progress-bar-wrap">
                  <div
                    className="sp-tts-progress-bar"
                    style={{
                      width: `${Math.round((ttsProgress.done / ttsProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <p className="sp-tts-progress-text">
                  {ttsState === "running"
                    ? `Generating ${ttsProgress.done + 1} / ${ttsProgress.total}: ${ttsProgress.current}`
                    : ttsState === "done"
                      ? `✓ All ${ttsProgress.total} questions generated`
                      : `Generated ${ttsProgress.done} / ${ttsProgress.total} — ${ttsProgress.errors.length} error(s)`}
                </p>
                {ttsProgress.errors.length > 0 && (
                  <ul className="sp-tts-errors">
                    {ttsProgress.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <button
              type="button"
              className="action-button action-button-primary"
              disabled={ttsState === "running"}
              onClick={handleGenerateTts}
              style={{ marginTop: 10 }}
            >
              {ttsState === "idle"
                ? `🎙️ Generate TTS for ${questionCount} question${questionCount !== 1 ? "s" : ""}`
                : ttsState === "running"
                  ? "Generating…"
                  : ttsState === "done"
                    ? "✓ Done — regenerate"
                    : "Retry generation"}
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
