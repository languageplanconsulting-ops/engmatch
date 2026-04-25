"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SpeakingReportSubmitPage() {
  const router = useRouter();
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [prompt, setPrompt] = useState(
    "Describe a person who gave you very useful advice.",
  );
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/mpeg")
      ? "audio/mpeg"
      : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    recRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setAudioBlob(blob);
      setAudioPreviewUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recRef.current?.stop();
    setRecording(false);
  }

  async function submit() {
    if (!transcript.trim()) {
      setError("Please add transcript text before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let audioUrl: string | null = null;
      if (audioBlob) {
        const form = new FormData();
        form.append("file", new File([audioBlob], "speaking.webm", { type: audioBlob.type || "audio/webm" }));
        form.append("attemptId", "report");
        form.append("questionId", "manual");
        const up = await fetch("/api/speaking/audio-upload", { method: "POST", body: form });
        const upJson = (await up.json()) as { audioUrl?: string; error?: string };
        if (!up.ok || !upJson.audioUrl) {
          throw new Error(upJson.error ?? "Failed to upload audio.");
        }
        audioUrl = upJson.audioUrl;
      }
      const res = await fetch("/api/speaking/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          transcript,
          audioUrl,
          mode: "part-3",
        }),
      });
      const json = (await res.json()) as { error?: string; item?: { id: string } };
      if (!res.ok || !json.item) {
        throw new Error(json.error ?? "Failed to create speaking submission.");
      }
      router.push(`/speaking/report/${json.item.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
      setSubmitting(false);
    }
  }

  return (
    <section className="stack-lg">
      <nav className="breadcrumbs">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>
          <Link href="/speaking">Speaking</Link> /{" "}
        </span>
        <span>Submit report</span>
      </nav>

      <div className="section-header">
        <h2>Speaking Report Submission</h2>
        <p>Paste/Type your answer and optionally record audio for admin review before validation.</p>
      </div>

      <label className="sp-notes-label">
        <span className="en">Question / Prompt</span>
        <textarea
          className="sp-notes-area"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>

      <label className="sp-notes-label">
        <span className="en">Your answer text (required)</span>
        <textarea
          className="sp-notes-area"
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Type or paste your speaking response..."
        />
      </label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!recording ? (
          <button type="button" className="sp-ready-btn" onClick={() => void startRecording()}>
            🎙 Record audio
          </button>
        ) : (
          <button type="button" className="sp-next-btn" onClick={stopRecording}>
            ⏹ Stop recording
          </button>
        )}
        <button type="button" className="sp-ready-btn" onClick={() => void submit()} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit for AI + admin validation"}
        </button>
      </div>

      {audioPreviewUrl && (
        <div className="sp-live-transcript-box">
          <div className="sp-live-transcript-header">
            <span className="sp-live-dot sp-live-dot-active" />
            <span>Audio recorded (mp3/webm depending browser)</span>
          </div>
          <audio controls src={audioPreviewUrl} style={{ width: "100%" }} />
        </div>
      )}

      {error && (
        <div className="status-banner">
          <strong>Could not submit</strong>
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
