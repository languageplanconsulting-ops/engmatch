"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { AssessmentResult } from "@/app/api/speaking/assess/route";
import { SpeakingAssessmentReport } from "@/components/speaking/speaking-assessment-report";

type Provider = "gemini" | "anthropic" | "openai";

type AssessApiPayload = AssessmentResult & {
  error?: string;
  providerFailures?: string[];
  providerDiagnostics?: Array<{
    provider: Provider;
    configured?: boolean;
    attempted?: boolean;
    ok?: boolean;
    model?: string;
    stage?: string;
    code?: string;
    message?: string;
    status?: number;
    responsePreview?: string;
  }>;
};

const SAMPLE_TRANSCRIPT = `i okay so consider myself as someone who like listens to a lot of music and my idol is definitely mariah carey and there was one time i felt like really really unsure. Of myself i felt really down i was discouraged because i just graduated and i just started my journey in the corporate world and i just had to hold back a lot because. I you know i don't i wasn't confident in myself and you know what happened i was listening to this song called the art of letting go well mariah did give me a piece. Of advice that was really valuable was you know when you find yourself in a toxic environment you find yourself in an environment that didn't serve you you need to have the courage to. Step out of there because nobody cared about you you have to take the step to better your life that was up pivotal moment in my life i would say it was changing everything. Like it was it changed the whole narrative that i used to have for myself and i stopped being this person that always blamed the situation always felt unlucky and i realized that if. I want to let go i have to let go i cannot wish for things to happen i have to do it and ultimately this is something that i have kept my entire life. And i will keep using it because it's so applicable such an amazing piece of advice.`;

const SAMPLE_QUESTION =
  "Describe a singer or piece of music that has been important in your life. You should say who or what it is, when you first became interested, how it affected you, and explain why it has stayed meaningful for you.";

const PROVIDER_TABS: { id: Provider; label: string; hint: string }[] = [
  { id: "gemini", label: "Gemini", hint: "First in production chain" },
  { id: "anthropic", label: "Claude", hint: "Second in production chain" },
  { id: "openai", label: "ChatGPT", hint: "Third in production chain" },
];

async function assessOneProvider(
  question: string,
  transcript: string,
  forceProvider: Provider,
): Promise<AssessmentResult> {
  const res = await fetch("/api/speaking/assess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      transcript,
      mode: "part-2",
      runtimeMode: "practice",
      forceProvider,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as AssessApiPayload;
  if (!res.ok) {
    const base = j.error ?? `HTTP ${res.status}`;
    const extra = j.providerFailures?.length ? ` — ${j.providerFailures.join(" | ")}` : "";
    throw new Error(base + extra);
  }
  return j as AssessmentResult;
}

export default function AdminSpeakingAssessTestPage() {
  const [question, setQuestion] = useState(SAMPLE_QUESTION);
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [tab, setTab] = useState<Provider>("gemini");
  const [byProvider, setByProvider] = useState<Partial<Record<Provider, AssessmentResult>>>({});
  const [errors, setErrors] = useState<Partial<Record<Provider, string>>>({});
  const [running, setRunning] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    setErrors({});
    const q = question.trim();
    const t = transcript.trim();
    if (!q || !t) {
      setRunning(false);
      return;
    }
    const next: Partial<Record<Provider, AssessmentResult>> = {};
    const nextErr: Partial<Record<Provider, string>> = {};
    await Promise.all(
      (["gemini", "anthropic", "openai"] as const).map(async (p) => {
        try {
          const data = await assessOneProvider(q, t, p);
          next[p] = data;
        } catch (e) {
          nextErr[p] = e instanceof Error ? e.message : "Unknown error";
        }
      }),
    );
    setByProvider(next);
    setErrors(nextErr);
    setRunning(false);
  }, [question, transcript]);

  return (
    <div className="stack-lg" style={{ maxWidth: 960 }}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> / <Link href="/admin/speaking">Admin Speaking</Link> /{" "}
        </span>
        <span>Assess test (multi-model)</span>
      </nav>

      <div className="section-header">
        <h2>Speaking Part 2 — multi-model assess test</h2>
        <p>
          Runs the same transcript through each LLM with <code>forceProvider</code> (admin session only).
          Use this to compare full reports side by side.
        </p>
      </div>

      <div className="list-card stack-md">
        <label className="stack-xs">
          <span className="font-medium">Cue card question (Part 2)</span>
          <textarea
            className="w-full rounded border border-slate-300 p-2 text-sm"
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <label className="stack-xs">
          <span className="font-medium">Transcript (ASR-style)</span>
          <textarea
            className="w-full rounded border border-slate-300 p-2 text-sm"
            rows={12}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </label>
        <button type="button" className="sp-ready-btn" disabled={running} onClick={() => void runAll()}>
          {running ? "Running all three models…" : "Run all models"}
        </button>
        <p className="text-sm text-slate-600">
          Each call may take up to ~75s. All three run in parallel; switch tabs when they finish.
        </p>
      </div>

      <div className="list-card stack-md">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Model">
          {PROVIDER_TABS.map(({ id, label, hint }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                tab === id
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title={hint}
              onClick={() => setTab(id)}
            >
              {label}
              {byProvider[id] && byProvider[id]?.errorCode !== "fallback" && (
                <span className="ml-1 text-xs font-normal text-emerald-700">· ready</span>
              )}
              {byProvider[id]?.errorCode === "fallback" && (
                <span className="ml-1 text-xs font-normal text-amber-700">· fallback</span>
              )}
              {errors[id] && <span className="ml-1 text-xs font-normal text-red-700">· error</span>}
            </button>
          ))}
        </div>

        {errors[tab] && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <strong>{tab}</strong>: {errors[tab]}
          </div>
        )}

        {byProvider[tab]?.providerDiagnostics?.length ? (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            <strong className="block mb-2">Provider diagnostics</strong>
            <ul className="space-y-2">
              {byProvider[tab].providerDiagnostics?.map((item) => (
                <li key={`${item.provider}-${item.model ?? "model"}`} className="rounded border border-slate-200 bg-white p-2">
                  <p>
                    <strong>{item.provider}</strong>
                    {item.model ? ` (${item.model})` : ""}
                    {item.ok ? " · success" : " · failed"}
                  </p>
                  <p>
                    stage: <strong>{item.stage ?? "unknown"}</strong>
                    {item.code ? ` · code: ${item.code}` : ""}
                    {typeof item.status === "number" ? ` · HTTP ${item.status}` : ""}
                  </p>
                  {item.message && <p>message: {item.message}</p>}
                  {item.responsePreview && <p>preview: {item.responsePreview}</p>}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {running && !byProvider[tab] && !errors[tab] && (
          <p className="sp-criterion-summary-th">Generating report for {tab}…</p>
        )}

        <SpeakingAssessmentReport
          question={question}
          transcript={transcript}
          mode="part-2"
          runtimeMode="practice"
          hideAssessTrigger
          seedResult={byProvider[tab] ?? null}
        />
      </div>
    </div>
  );
}
