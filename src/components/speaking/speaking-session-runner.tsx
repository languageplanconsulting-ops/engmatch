"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSpeakingModeLabel,
  getSpeakingTestsByMode,
  mergeSpeakingTests,
  type SpeakingAnyTest,
  type SpeakingCueCardTest,
  type SpeakingFullMockTest,
  type SpeakingMode,
  type SpeakingQuickfireTest,
  type SpeakingTip,
  type StoredSpeakingPackRecord,
} from "@/lib/speaking-demo";
import { SpeakingAssessmentReport } from "@/components/speaking/speaking-assessment-report";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playQuestion(text: string, audioUrl?: string) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => readAloudBrowser(text));
    return;
  }
  readAloudBrowser(text);
}

function playQuestionAndWait(text: string, audioUrl?: string) {
  return new Promise<void>((resolve) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => resolve();
      audio.onerror = () => {
        readAloudBrowser(text);
        resolve();
      };
      audio.play().catch(() => {
        readAloudBrowser(text);
        resolve();
      });
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

function readAloudBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

// ─── Corner tips widget ───────────────────────────────────────────────────────

const TIP_LABELS: Record<SpeakingTip["type"], { en: string; th: string }> = {
  grammar: { en: "Grammar", th: "ไวยากรณ์" },
  vocabulary: { en: "Vocabulary", th: "คำศัพท์" },
  pattern: { en: "Pattern", th: "รูปแบบประโยค" },
};

const TIP_COLORS: Record<SpeakingTip["type"], string> = {
  grammar: "#1d4ed8",
  vocabulary: "#0891b2",
  pattern: "#854d0e",
};

const TIP_BG: Record<SpeakingTip["type"], string> = {
  grammar: "#dbeafe",
  vocabulary: "#cffafe",
  pattern: "#fef9c3",
};

function CornerTips({ tips }: { tips: SpeakingTip[] }) {
  const [open, setOpen] = useState(false);
  const types = useMemo(
    () => (["grammar", "vocabulary", "pattern"] as SpeakingTip["type"][]).filter(
      (t) => tips.some((tip) => tip.type === t),
    ),
    [tips],
  );
  const [activeTab, setActiveTab] = useState<SpeakingTip["type"]>(types[0] ?? "grammar");
  const activeTips = tips.filter((t) => t.type === activeTab);

  if (!tips.length) return null;

  return (
    <div className="sp-corner-tips">
      <button
        type="button"
        className={`sp-corner-tips-btn${open ? " sp-corner-tips-btn-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Tips"
      >
        💡
        <span className="sp-corner-tips-label">
          <span className="en">Tips</span>
          <span className="th">เคล็ดลับ</span>
        </span>
      </button>

      {open && (
        <div className="sp-corner-panel">
          <div className="sp-corner-panel-header">
            <div>
              <p className="sp-corner-panel-title">Quick tips · เคล็ดลับ</p>
            </div>
            <button type="button" className="sp-corner-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="sp-corner-tab-row">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={`sp-corner-tab${activeTab === t ? " sp-corner-tab-active" : ""}`}
                style={activeTab === t ? { borderBottomColor: TIP_COLORS[t], color: TIP_COLORS[t] } : {}}
                onClick={() => setActiveTab(t)}
              >
                {TIP_LABELS[t].en}
                <span className="sp-corner-tab-th">{TIP_LABELS[t].th}</span>
              </button>
            ))}
          </div>

          <div className="sp-corner-body">
            {activeTips.map((tip, i) => (
              <div key={i} className="sp-corner-tip-card" style={{ borderLeftColor: TIP_COLORS[activeTab] }}>
                <p className="sp-corner-tip-title">{tip.title}</p>
                <p className="sp-corner-tip-body">{tip.body}</p>
                {tip.examples?.map((ex, j) => (
                  <p key={j} className="sp-corner-tip-example" style={{ borderLeftColor: TIP_COLORS[activeTab], background: TIP_BG[activeTab] }}>
                    &ldquo;{ex}&rdquo;
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mode selector ────────────────────────────────────────────────────────────

type TestMode = "practice" | "live";

function ModeSelector({ onSelect }: { onSelect: (m: TestMode) => void }) {
  return (
    <div className="sp-mode-selector">
      <button type="button" className="sp-mode-card" onClick={() => onSelect("practice")}>
        <span className="sp-mode-icon">📝</span>
        <strong className="sp-mode-title">
          Practice Test
          <span className="sp-mode-title-th">แบบฝึกหัด</span>
        </strong>
        <p className="sp-mode-desc">
          Read the question, jot notes, then answer when you&apos;re ready.
          <span className="sp-mode-desc-th">อ่านคำถาม จดบันทึก แล้วค่อยพูดตอบเมื่อพร้อม</span>
        </p>
        <span className="sp-mode-cta">Choose · เลือก →</span>
      </button>

      <button type="button" className="sp-mode-card sp-mode-card-live" onClick={() => onSelect("live")}>
        <span className="sp-mode-icon">🎙️</span>
        <strong className="sp-mode-title">
          Live Practice
          <span className="sp-mode-title-th">ฝึกจริง</span>
        </strong>
        <p className="sp-mode-desc">
          Timed exactly like the real exam — questions auto-advance.
          <span className="sp-mode-desc-th">จับเวลาเหมือนสอบจริง คำถามเปลี่ยนอัตโนมัติ</span>
        </p>
        <span className="sp-mode-cta">Choose · เลือก →</span>
      </button>
    </div>
  );
}

// ─── Live voice capture hook ──────────────────────────────────────────────────

type TranscriptState = { final: string; interim: string };

function useVoiceCapture(active: boolean) {
  const [transcript, setTranscript] = useState<TranscriptState>({ final: "", interim: "" });
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopAll = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    recRef.current?.stop();
    recRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    if (!active) { stopAll(); return; }

    setTranscript({ final: "", interim: "" });

    async function startDeepgram(token: string) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const ws = new WebSocket(
          "wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&encoding=linear16&sample_rate=16000&interim_results=true",
          ["token", token],
        );
        wsRef.current = ws;

        ws.onopen = () => {
          const ctx = new AudioContext({ sampleRate: 16000 });
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const proc = ctx.createScriptProcessor(4096, 1, 1);
          src.connect(proc);
          proc.connect(ctx.destination);
          proc.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const floats = e.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(floats.length);
            for (let i = 0; i < floats.length; i++) {
              pcm[i] = Math.max(-32768, Math.min(32767, floats[i] * 32768));
            }
            ws.send(pcm.buffer);
          };
          setListening(true);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data as string) as {
            channel?: { alternatives?: { transcript?: string }[] };
            is_final?: boolean;
          };
          const text = data.channel?.alternatives?.[0]?.transcript ?? "";
          if (!text) return;
          if (data.is_final) {
            setTranscript((p) => ({ final: (p.final + " " + text).trim(), interim: "" }));
          } else {
            setTranscript((p) => ({ ...p, interim: text }));
          }
        };
      } catch {
        startBrowserSpeech();
      }
    }

    function startBrowserSpeech() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!Ctor) { setListening(true); return; }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const rec = new Ctor();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rec.continuous = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rec.interimResults = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rec.lang = "en-US";
      recRef.current = rec;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rec.onresult = (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
        let interim = "";
        let fin = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        setTranscript((p) => ({ final: (p.final + " " + fin).trim(), interim }));
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rec.start();
      setListening(true);
    }

    fetch("/api/speaking/deepgram/token")
      .then((r) => r.json())
      .then((d: { available: boolean; token: string | null }) => {
        if (d.available && d.token) void startDeepgram(d.token);
        else startBrowserSpeech();
      })
      .catch(() => startBrowserSpeech());

    return () => stopAll();
  }, [active, stopAll]);

  const fullText = (transcript.final + " " + transcript.interim).trim();
  return { fullText, listening };
}

// ─── QuickfireRunner ──────────────────────────────────────────────────────────

type Phase =
  | "mode-select"
  | "practice-plan-all"
  | "practice-read"
  | "practice-answer"
  | "practice-next"
  | "live"
  | "all-done";

function QuickfireRunner({
  mode,
  test,
}: {
  mode: "part-1" | "part-3";
  test: SpeakingQuickfireTest;
}) {
  const [phase, setPhase] = useState<Phase>("mode-select");
  const [testMode, setTestMode] = useState<TestMode>("practice");
  const [qIdx, setQIdx] = useState(0);
  const [prepIdx, setPrepIdx] = useState(0);
  const [notesByQuestion, setNotesByQuestion] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [savedAnswers, setSavedAnswers] = useState<
    Record<string, { transcript: string; notes: string }>
  >({});

  const q = test.questions[Math.min(qIdx, test.questions.length - 1)];
  const prepQuestion = test.questions[Math.min(prepIdx, test.questions.length - 1)];
  const activeQuestionIndex = phase === "practice-plan-all" ? prepIdx : qIdx;
  const activeQuestion = phase === "practice-plan-all" ? prepQuestion : q;
  const isLast = qIdx === test.questions.length - 1;
  const isAnswering = phase === "practice-answer" || phase === "live";
  const enforceOneMinutePerQuestion = mode === "part-1";
  const waitForTtsBeforeAnswer = mode === "part-1";
  const [speechReady, setSpeechReady] = useState(!waitForTtsBeforeAnswer);
  const questionRunRef = useRef(0);
  const currentQuestionNote = notesByQuestion[q.id] ?? "";

  const { fullText: transcript, listening } = useVoiceCapture(
    isAnswering && (!waitForTtsBeforeAnswer || speechReady),
  );

  // Timer
  useEffect(() => {
    if (!isAnswering) return;
    if (waitForTtsBeforeAnswer && !speechReady) return;
    setTimeLeft(60);
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          onTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx, speechReady, waitForTtsBeforeAnswer]);

  // Speak question when answer phase begins
  useEffect(() => {
    if (!isAnswering) return;
    if (!waitForTtsBeforeAnswer) {
      setSpeechReady(true);
      playQuestion(q.ttsText, q.ttsAudioUrl);
      return;
    }

    const runId = questionRunRef.current + 1;
    questionRunRef.current = runId;
    setSpeechReady(false);
    void playQuestionAndWait(q.ttsText, q.ttsAudioUrl).finally(() => {
      if (questionRunRef.current !== runId) return;
      setSpeechReady(true);
    });
  }, [isAnswering, q, waitForTtsBeforeAnswer]);

  function saveAnswer() {
    setSavedAnswers((p) => ({ ...p, [q.id]: { transcript, notes: currentQuestionNote } }));
  }

  function onTimeUp() {
    saveAnswer();
    if (isLast) setPhase("all-done");
    else if (testMode === "live") {
      setQIdx((i) => i + 1);
    } else if (enforceOneMinutePerQuestion) {
      setQIdx((i) => i + 1);
      setPhase("practice-answer");
    } else setPhase("practice-next");
  }

  function selectMode(m: TestMode) {
    setTestMode(m);
    setQIdx(0);
    setPrepIdx(0);
    setNotesByQuestion({});
    setPhase(m === "live" ? "live" : mode === "part-1" ? "practice-plan-all" : "practice-read");
  }

  function goNext() {
    saveAnswer();
    if (isLast) { setPhase("all-done"); return; }
    setQIdx((i) => i + 1);
    setPhase("practice-read");
  }

  const progressPct = Math.round((Object.keys(savedAnswers).length / test.questions.length) * 100);

  // ── Mode select ──
  if (phase === "mode-select") {
    return (
      <div className="sp-runner-page">
        <nav className="breadcrumbs">
          <span><Link href="/">Home</Link> / </span>
          <span><Link href="/speaking">Speaking · การพูด</Link> / </span>
          <span><Link href={`/speaking/${mode}`}>{getSpeakingModeLabel(mode)}</Link> / </span>
          <span>{test.name}</span>
        </nav>
        <div className="sp-runner-header">
          <div>
            <p className="sp-runner-kicker">IELTS Speaking · {getSpeakingModeLabel(mode)}</p>
            <h1 className="sp-runner-title">{test.name}</h1>
            <p className="sp-runner-topic">{test.topic} · {test.questions.length} คำถาม / questions</p>
          </div>
        </div>
        <p className="sp-mode-prompt">
          เลือกโหมดฝึกพูด
          <span className="sp-mode-prompt-en"> · How would you like to practise?</span>
        </p>
        <ModeSelector onSelect={selectMode} />
      </div>
    );
  }

  // ── All done ──
  if (phase === "all-done") {
    return (
      <div className="sp-runner-page">
        <nav className="breadcrumbs">
          <span><Link href="/">Home</Link> / </span>
          <span><Link href="/speaking">Speaking</Link> / </span>
          <span>{getSpeakingModeLabel(mode)}</span>
        </nav>

        <div className="sp-done-header">
          <span className="sp-done-check">✓</span>
          <h1>เสร็จแล้ว! · Well done!</h1>
          <p>คุณตอบครบ {test.questions.length} คำถามแล้ว · You answered all {test.questions.length} questions.</p>
        </div>

        <div className="sp-done-cards">
          {test.questions.map((question, i) => {
            const saved = savedAnswers[question.id];
            return (
              <div key={question.id} className="sp-done-card">
                <p className="sp-done-card-num">คำถามที่ {i + 1} · Q{i + 1}</p>
                <p className="sp-done-card-prompt">{question.prompt}</p>
                {saved?.transcript ? (
                  <>
                    <p className="sp-done-card-label">คำตอบของคุณ · Your answer</p>
                    <p className="sp-done-card-transcript">{saved.transcript}</p>
                    <SpeakingAssessmentReport
                      question={question.prompt}
                      transcript={saved.transcript}
                      mode={mode}
                    />
                  </>
                ) : (
                  <p className="sp-done-card-muted">ไม่มีคำตอบที่บันทึกไว้ · No recorded answer.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="sp-done-actions">
          <button
            type="button"
            className="sp-done-restart"
            onClick={() => {
              setSavedAnswers({});
              setQIdx(0);
              setPrepIdx(0);
              setNotesByQuestion({});
              setPhase("mode-select");
            }}
          >
            ← ลองอีกครั้ง · Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Main runner ──
  return (
    <div className="sp-runner-page">
      <nav className="breadcrumbs">
        <span><Link href="/">Home</Link> / </span>
        <span><Link href="/speaking">Speaking</Link> / </span>
        <span><Link href={`/speaking/${mode}`}>{getSpeakingModeLabel(mode)}</Link> / </span>
        <span>{test.name}</span>
      </nav>

      <div className="sp-runner-layout">
        {/* ── Left: main ── */}
        <div className="sp-runner-main">
          {/* Progress */}
          <div className="sp-progress-bar-wrap">
            <div className="sp-progress-bar" style={{ width: `${progressPct}%` }} />
            <span className="sp-progress-label">{activeQuestionIndex + 1} / {test.questions.length}</span>
          </div>

          {/* Question */}
          <div className="sp-question-card">
            <p className="sp-question-num">
              {getSpeakingModeLabel(mode)} · คำถามที่ {activeQuestionIndex + 1}
            </p>
            <p className="sp-question-text">{activeQuestion.prompt}</p>
          </div>

          {/* Part 1 practice: prepare notes for all questions first */}
          {phase === "practice-plan-all" && (
            <div className="sp-practice-read">
              <label className="sp-notes-label">
                <span className="en">Your note for this question</span>
                <span className="th">บันทึกสำหรับคำถามนี้ (แยกเป็นรายข้อ)</span>
                <textarea
                  className="sp-notes-area"
                  placeholder="จดคำสำคัญสำหรับคำถามนี้… / Jot key ideas for this question…"
                  value={notesByQuestion[prepQuestion.id] ?? ""}
                  onChange={(e) =>
                    setNotesByQuestion((prev) => ({ ...prev, [prepQuestion.id]: e.target.value }))
                  }
                  rows={5}
                />
              </label>
              <button
                type="button"
                className="sp-ready-btn"
                onClick={() => {
                  if (prepIdx === test.questions.length - 1) {
                    setQIdx(0);
                    setPhase("practice-answer");
                    return;
                  }
                  setPrepIdx((i) => i + 1);
                }}
              >
                {prepIdx === test.questions.length - 1
                  ? "🎙️ พร้อมแล้ว เริ่มพูดทีละคำถาม · I&apos;m ready to speak"
                  : "เตรียมโน้ตคำถามถัดไป · Prepare note for next question →"}
              </button>
            </div>
          )}

          {/* Practice read — notes */}
          {phase === "practice-read" && (
            <div className="sp-practice-read">
              <label className="sp-notes-label">
                <span className="en">Your notes</span>
                <span className="th">บันทึกของคุณ (ไม่บังคับ)</span>
                <textarea
                  className="sp-notes-area"
                  placeholder="จดคำสำคัญไว้ก่อนตอบ… / Jot key ideas before speaking…"
                  value={currentQuestionNote}
                  onChange={(e) =>
                    setNotesByQuestion((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  rows={5}
                />
              </label>
              <button type="button" className="sp-ready-btn" onClick={() => setPhase("practice-answer")}>
                🎙️ พร้อมแล้ว ตอบได้เลย · I&apos;m ready to answer
              </button>
            </div>
          )}

          {/* Answering */}
          {(phase === "practice-answer" || phase === "live") && (
            <div className="sp-answer-phase">
              {waitForTtsBeforeAnswer && !speechReady ? (
                <div className="sp-timer-ring">
                  <span className="sp-timer-num">--:--</span>
                  <span className="sp-timer-label">ผู้คุมสอบกำลังถามคำถาม · examiner speaking</span>
                </div>
              ) : (
                <div className="sp-timer-ring">
                  <span className="sp-timer-num">{formatClock(timeLeft)}</span>
                  <span className="sp-timer-label">เวลาที่เหลือ · remaining</span>
                </div>
              )}

              <div className="sp-live-transcript-box">
                <div className="sp-live-transcript-header">
                  <span className={`sp-live-dot${listening ? " sp-live-dot-active" : ""}`} />
                  <span>
                    {waitForTtsBeforeAnswer && !speechReady
                      ? "รอผู้คุมสอบพูดจบ… · Waiting for examiner…"
                      : listening
                      ? "กำลังฟัง… · Listening…"
                      : "ระบบรับเสียง · Voice recognition"}
                  </span>
                </div>
                <p className="sp-live-transcript-text">
                  {waitForTtsBeforeAnswer && !speechReady
                    ? "ระบบจะเริ่มจับเวลาและถอดเสียงทันทีเมื่อคำถามพูดจบ · Timer and live transcript will start right after TTS ends."
                    : transcript || "เริ่มพูดได้เลย — คำพูดของคุณจะปรากฏที่นี่ · Start speaking — your words will appear here…"}
                </p>
              </div>

              {phase === "practice-answer" && !enforceOneMinutePerQuestion && (
                <button type="button" className="sp-next-btn" onClick={goNext}>
                  {isLast ? "เสร็จสิ้น · Finish →" : "คำถามต่อไป · Next →"}
                </button>
              )}
            </div>
          )}

          {/* Between questions */}
          {phase === "practice-next" && (
            <div className="sp-between-card">
              <p className="sp-between-saved">✓ บันทึกคำตอบแล้ว · Answer saved</p>
              <button
                type="button"
                className="sp-ready-btn"
                onClick={() => {
                  setQIdx((i) => i + 1);
                  setPhase("practice-read");
                }}
              >
                คำถามต่อไป · Next question →
              </button>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="sp-runner-side">
          {/* Notes snapshot */}
          {phase === "practice-answer" && currentQuestionNote && (
            <div className="sp-side-section">
              <p className="sp-side-label">บันทึก · Notes</p>
              <div className="sp-side-notes">{currentQuestionNote}</div>
            </div>
          )}

          {/* Question list */}
          <div className="sp-side-section">
            <p className="sp-side-label">คำถาม · Questions</p>
            <ul className="sp-side-question-list">
              {test.questions.map((question, i) => {
                const done = Boolean(savedAnswers[question.id]);
                const active = i === activeQuestionIndex;
                return (
                  <li
                    key={question.id}
                    className={`sp-side-q-item${active ? " sp-side-q-active" : ""}${done ? " sp-side-q-done" : ""}`}
                  >
                    <span className="sp-side-q-num">{done ? "✓" : i + 1}</span>
                    <span className="sp-side-q-text">{question.prompt}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Mode */}
          <div className="sp-side-section">
            <p className="sp-side-label">โหมด · Mode</p>
            <span className={`sp-mode-badge sp-mode-badge-${testMode}`}>
              {testMode === "live" ? "🎙️ ฝึกจริง · Live" : "📝 แบบฝึกหัด · Practice"}
            </span>
          </div>
        </aside>
      </div>

      {/* Corner tips — visible during practice read/answer */}
      {test.tips?.length && (phase === "practice-read" || phase === "practice-answer" || phase === "practice-next" || phase === "live") && (
        <CornerTips tips={test.tips} />
      )}
    </div>
  );
}

// ─── CueCardRunner ────────────────────────────────────────────────────────────

function CueCardRunner({ test }: { test: SpeakingCueCardTest }) {
  const [prepMinutes, setPrepMinutes] = useState(test.preparationOptions[0] ?? 1);
  const [stage, setStage] = useState<"setup" | "prep" | "speak" | "review" | "done">("setup");
  const [prepLeft, setPrepLeft] = useState(prepMinutes * 60);
  const [speakLeft, setSpeakLeft] = useState(120);
  const [speechReady, setSpeechReady] = useState(false);
  const [notes, setNotes] = useState("");
  const [frozenNotes, setFrozenNotes] = useState("");
  const [attempt, setAttempt] = useState(1);
  const notesRef = useRef("");
  const speakRunRef = useRef(0);

  const { fullText: transcript, listening } = useVoiceCapture(stage === "speak" && speechReady);

  const startSpeakingRound = useCallback(() => {
    const runId = speakRunRef.current + 1;
    speakRunRef.current = runId;
    setSpeechReady(false);
    setStage("speak");
    setSpeakLeft(120);
    void playQuestionAndWait(test.question.ttsText, test.question.ttsAudioUrl).finally(() => {
      if (speakRunRef.current !== runId) return;
      setSpeechReady(true);
    });
  }, [test.question.ttsAudioUrl, test.question.ttsText]);

  useEffect(() => {
    if (stage !== "prep") return;
    const id = window.setInterval(() => {
      setPrepLeft((v) => {
        if (v <= 1) {
          window.clearInterval(id);
          setFrozenNotes(notesRef.current);
          startSpeakingRound();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stage, startSpeakingRound]);

  useEffect(() => {
    if (stage !== "speak" || !speechReady) return;
    const id = window.setInterval(() => {
      setSpeakLeft((v) => {
        if (v <= 1) { window.clearInterval(id); setStage("review"); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [attempt, speechReady, stage]);

  return (
    <div className="sp-runner-page">
      <nav className="breadcrumbs">
        <span><Link href="/">Home</Link> / </span>
        <span><Link href="/speaking">Speaking</Link> / </span>
        <span><Link href="/speaking/part-2">Part 2</Link> / </span>
        <span>{test.name}</span>
      </nav>

      <div className="sp-runner-layout">
        <div className="sp-runner-main">
          <div className="sp-question-card">
            <p className="sp-question-num">Part 2 · บัตรหัวข้อ</p>
            <p className="sp-question-text">{test.question.prompt}</p>
          </div>

          {stage === "setup" && (
            <div className="sp-practice-read">
              <label className="sp-notes-label">
                <span className="en">Preparation time</span>
                <span className="th">เลือกเวลาเตรียมตัว</span>
                <select className="sp-prep-select" value={prepMinutes}
                  onChange={(e) => setPrepMinutes(Number(e.target.value))}>
                  {test.preparationOptions.map((o) => (
                    <option key={o} value={o}>{o} นาที · minute{o > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="sp-ready-btn"
                onClick={() => { setPrepLeft(prepMinutes * 60); setStage("prep"); }}>
                เริ่มเตรียมตัว · Start preparation →
              </button>
            </div>
          )}

          {stage === "prep" && (
            <div className="sp-practice-read">
              <div className="sp-timer-ring">
                <span className="sp-timer-num">{formatClock(prepLeft)}</span>
                <span className="sp-timer-label">เวลาเตรียมตัว · prep time</span>
              </div>
              <label className="sp-notes-label">
                <span className="en">Preparation notes</span>
                <span className="th">บันทึกก่อนพูด</span>
                <textarea className="sp-notes-area" rows={6} value={notes}
                  placeholder="จดคำสำคัญ / Key points…"
                  onChange={(e) => { notesRef.current = e.target.value; setNotes(e.target.value); }} />
              </label>
              <button type="button" className="sp-ready-btn"
                onClick={() => {
                  setFrozenNotes(notes);
                  startSpeakingRound();
                }}>
                🎙️ พร้อมแล้ว · I&apos;m ready to speak
              </button>
            </div>
          )}

          {stage === "speak" && (
            <div className="sp-answer-phase">
              {speechReady ? (
                <div className="sp-timer-ring">
                  <span className="sp-timer-num">{formatClock(speakLeft)}</span>
                  <span className="sp-timer-label">เวลาที่เหลือ · remaining</span>
                </div>
              ) : (
                <div className="sp-timer-ring">
                  <span className="sp-timer-num">--:--</span>
                  <span className="sp-timer-label">ผู้คุมสอบกำลังถามคำถาม · examiner speaking</span>
                </div>
              )}
              <div className="sp-live-transcript-box">
                <div className="sp-live-transcript-header">
                  <span className={`sp-live-dot${listening ? " sp-live-dot-active" : ""}`} />
                  <span>{speechReady ? "กำลังฟัง… · Listening…" : "รอผู้คุมสอบพูดจบ… · Waiting for examiner…"}</span>
                </div>
                <p className="sp-live-transcript-text">
                  {speechReady
                    ? transcript || "เริ่มพูดได้เลย… · Start speaking…"
                    : "ระบบจะเริ่มจับเวลาและถอดเสียงทันทีเมื่อคำถามพูดจบ · Timer and live transcript will start right after TTS ends."}
                </p>
              </div>
            </div>
          )}

          {stage === "review" && (
            <div className="sp-between-card">
              <p className="sp-between-saved">หมดเวลา! พอใจกับคำตอบนี้ไหม? · Time&apos;s up! Happy with that attempt?</p>
              <SpeakingAssessmentReport question={test.question.prompt} transcript={transcript} mode="part-1" />
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="button" className="sp-ready-btn" onClick={() => setStage("done")}>
                  ✓ บันทึก · Save
                </button>
                <button type="button" className="sp-next-btn"
                  onClick={() => { setAttempt((a) => a + 1); startSpeakingRound(); }}>
                  ลองใหม่ · Try again
                </button>
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="sp-between-card">
              <p className="sp-between-saved">✓ บันทึกแล้ว เยี่ยมมาก! · Saved. Well done!</p>
              <Link href="/speaking/part-2" className="sp-done-restart">← กลับ · Back to Part 2</Link>
            </div>
          )}
        </div>

        <aside className="sp-runner-side">
          {frozenNotes && (
            <div className="sp-side-section">
              <p className="sp-side-label">บันทึก · Notes</p>
              <div className="sp-side-notes">{frozenNotes}</div>
            </div>
          )}
          <div className="sp-side-section">
            <p className="sp-side-label">ขั้นตอน · Stage</p>
            <span className="sp-mode-badge sp-mode-badge-practice">
              {stage === "setup" ? "เลือกเวลา · Choose prep"
                : stage === "prep" ? "เตรียมตัว · Preparation"
                : stage === "speak" ? "🎙️ กำลังพูด · Speaking"
                : stage === "review" ? "ตรวจสอบ · Review"
                : "✓ เสร็จสิ้น · Done"}
            </span>
          </div>
          {attempt > 1 && (
            <div className="sp-side-section">
              <p className="sp-side-label">ครั้งที่ · Attempt</p>
              <strong style={{ fontSize: "1.5rem" }}>{attempt}</strong>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── Full test preview ────────────────────────────────────────────────────────

function FullTestPreview({ test }: { test: SpeakingFullMockTest }) {
  return (
    <div className="sp-runner-page">
      <nav className="breadcrumbs">
        <span><Link href="/">Home</Link> / </span>
        <span><Link href="/speaking">Speaking</Link> / </span>
        <span><Link href="/speaking/full-test">Full Test</Link> / </span>
        <span>{test.name}</span>
      </nav>
      <div className="sp-runner-header">
        <div>
          <p className="sp-runner-kicker">การสอบพูดเต็มรูปแบบ · Full Speaking Test</p>
          <h1 className="sp-runner-title">{test.name}</h1>
          <p className="sp-runner-topic">{test.topic}</p>
        </div>
      </div>
      <div className="sp-mode-selector">
        {[
          { icon: "P1", title: "ตอนที่ 1 · Part 1", desc: `${test.part1.length} คำถาม / questions` },
          { icon: "P2", title: "ตอนที่ 2 · Part 2", desc: "1 บัตรหัวข้อ / cue card" },
          { icon: "P3", title: "ตอนที่ 3 · Part 3", desc: `${test.part3.length} คำถาม / questions` },
        ].map((s) => (
          <div key={s.icon} className="sp-mode-card" style={{ cursor: "default" }}>
            <span className="sp-mode-icon">{s.icon}</span>
            <strong className="sp-mode-title">{s.title}</strong>
            <p className="sp-mode-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function SpeakingSessionRunner({ mode, test }: { mode: SpeakingMode; test: SpeakingAnyTest }) {
  if (mode === "part-1" || mode === "part-3")
    return <QuickfireRunner mode={mode} test={test as SpeakingQuickfireTest} />;
  if (mode === "part-2")
    return <CueCardRunner test={test as SpeakingCueCardTest} />;
  return <FullTestPreview test={test as SpeakingFullMockTest} />;
}

export function SpeakingSessionLoader({ mode, testId }: { mode: SpeakingMode; testId: string }) {
  const [test, setTest] = useState<SpeakingAnyTest | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const defaultMatch = getSpeakingTestsByMode(mode).find((t) => t.id === testId) ?? null;
      const res = await fetch("/api/speaking/packs", { cache: "no-store" });

      if (!res.ok) {
        if (active) setTest(defaultMatch);
        return;
      }

      const data = (await res.json()) as { items?: StoredSpeakingPackRecord[] };
      const merged =
        mergeSpeakingTests(mode, data.items ?? []).find((t) => t.id === testId) ?? defaultMatch;

      if (active) setTest(merged);
    }

    void load();
    return () => {
      active = false;
    };
  }, [mode, testId]);

  if (!test) {
    return (
      <div className="sp-runner-page">
        <nav className="breadcrumbs">
          <span><Link href="/">Home</Link> / </span>
          <span><Link href="/speaking">Speaking</Link> / </span>
          <span>{getSpeakingModeLabel(mode)}</span>
        </nav>
        <div className="status-banner">
          <strong>ไม่พบชุดข้อสอบนี้ · Speaking pack not found</strong>
          <p>กรุณากลับไปเลือกชุดอื่น · Please go back and choose another pack.</p>
        </div>
      </div>
    );
  }

  return <SpeakingSessionRunner mode={mode} test={test} />;
}
