"use client";

import { useEffect, useState, type ReactNode } from "react";
import type {
  AssessmentResult,
  BilingualBullet,
  BucketChecklist,
  StepUpCorrection,
} from "@/app/api/speaking/assess/route";

function SectionTitle({ thai, english }: { thai: string; english: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-[#004aad]">{thai}</h2>
      <p className="text-sm text-slate-500">{english}</p>
    </div>
  );
}

function QuoteChip({ quote, tone = "blue" }: { quote: string; tone?: "blue" | "green" | "amber" | "red" }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-blue-200 bg-blue-50 text-[#004aad]";
  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{quote}</span>;
}

function EvidenceBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="mt-2 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedTranscript(transcript: string, issues: string[]) {
  if (!transcript.trim()) return transcript;
  const words = Array.from(
    new Set(
      issues
        .map((issue) => issue.replace(/\(\d+%\)\s*$/, "").trim())
        .filter(Boolean),
    ),
  );
  if (words.length === 0) return transcript;
  const regex = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
  const parts = transcript.split(regex);

  return parts.map((part, idx) => {
    const matched = words.some((word) => word.toLowerCase() === part.toLowerCase());
    if (!matched) return <span key={`${part}-${idx}`}>{part}</span>;
    return (
      <mark key={`${part}-${idx}`} className="rounded bg-red-100 px-1 py-0.5 font-semibold text-red-700">
        {part}
      </mark>
    );
  });
}

function ScoreRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${highlight ? "border-[#004aad] bg-blue-50" : "border-slate-200 bg-white"}`}>
      <p className={`text-sm font-semibold ${highlight ? "text-[#004aad]" : "text-slate-700"}`}>{label}</p>
      <p className={`text-xl font-black ${highlight ? "text-[#004aad]" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function ChecklistItem({
  item,
  state,
}: {
  item: BilingualBullet;
  state: "achieved" | "target";
}) {
  const isAchieved = state === "achieved";
  return (
    <div className={`rounded-lg border p-4 ${isAchieved ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 text-base font-bold ${isAchieved ? "text-emerald-600" : "text-amber-600"}`}>
          {isAchieved ? "✓" : "!"}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">{item.thai}</p>
            <p className="text-xs text-slate-500">{item.english}</p>
          </div>

          {item.evidenceQuotes && item.evidenceQuotes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.evidenceQuotes.map((quote, idx) => (
                <QuoteChip key={`${quote}-${idx}`} quote={quote} tone={isAchieved ? "green" : "red"} />
              ))}
            </div>
          )}

          {(item.evidenceThai || item.evidenceEnglish) && (
            <EvidenceBox title="Evidence">
              {item.evidenceThai && <p>{item.evidenceThai}</p>}
              {item.evidenceEnglish && <p className="mt-1 text-slate-500">{item.evidenceEnglish}</p>}
            </EvidenceBox>
          )}

          {!isAchieved && (
            <div className="grid gap-3 md:grid-cols-3">
              <EvidenceBox title="Suggested Vocabulary">
                {item.suggestedVocabulary ?? "-"}
              </EvidenceBox>
              <EvidenceBox title="Suggested Fix">
                {item.suggestedFix ?? "-"}
              </EvidenceBox>
              <EvidenceBox title="Suggested Sentence">
                <span className="italic">{item.suggestedSentence ?? "-"}</span>
              </EvidenceBox>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BucketSection({
  title,
  subtitle,
  checklist,
}: {
  title: string;
  subtitle: string;
  checklist: BucketChecklist;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#004aad]">{subtitle}</h3>
            <p className="text-sm text-slate-500">{title}</p>
          </div>
          <div className="rounded-full bg-[#004aad] px-4 py-1.5 text-sm font-bold text-white">
            {`Band ${checklist.currentBand.toFixed(1)}`}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Achieved</p>
        {checklist.achieved.map((item, idx) => (
          <ChecklistItem key={idx} item={item} state="achieved" />
        ))}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">{`Target +1 Band (${checklist.nextTargetBand.toFixed(1)})`}</p>
        {checklist.missingForNextBand.map((item, idx) => (
          <ChecklistItem key={idx} item={item} state="target" />
        ))}
      </div>
    </section>
  );
}

function CorrectionCard({ correction }: { correction: StepUpCorrection }) {
  const label =
    correction.type === "grammar"
      ? "Grammar"
      : correction.type === "vocabulary"
        ? "Vocabulary"
        : "Fluency";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-bold text-[#004aad]">
        {`${label} · Target Band ${correction.targetBand}`}
      </div>

      {correction.type === "fluency" ? (
        <EvidenceBox title="Suggestion to Add">
          <span className="italic">{correction.suggestionToAdd ?? "-"}</span>
        </EvidenceBox>
      ) : (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center">
            <span className="rounded-md bg-rose-50 px-3 py-2 text-rose-600 line-through decoration-2">
              {correction.originalText ?? "-"}
            </span>
            <span className="font-bold text-[#004aad]">→</span>
            <span className="rounded-md bg-emerald-50 px-3 py-2 font-bold text-emerald-700 underline decoration-2 underline-offset-4">
              {correction.improvedText ?? "-"}
            </span>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-r-lg border-l-4 border-[#004aad] bg-blue-50/50 py-2 pl-4">
        <p className="text-sm font-semibold text-slate-800">{correction.thaiExplanation}</p>
        <p className="mt-1 text-sm text-slate-600">{correction.englishExplanation}</p>
      </div>
    </div>
  );
}

export function SpeakingAssessmentReport({
  question,
  transcript,
  mode,
  runtimeMode,
  seedResult,
  hideAssessTrigger,
}: {
  question: string;
  transcript: string;
  mode: "part-1" | "part-2" | "part-3";
  runtimeMode?: "mock" | "practice" | "intensive";
  seedResult?: AssessmentResult | null;
  hideAssessTrigger?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(() => (seedResult ? "done" : "idle"));
  const [result, setResult] = useState<AssessmentResult | null>(() => seedResult ?? null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(1);

  useEffect(() => {
    if (seedResult === undefined) return;
    setResult(seedResult ?? null);
    setState(seedResult ? "done" : "idle");
  }, [seedResult]);

  useEffect(() => {
    if (state !== "loading") return;
    const interval = window.setInterval(() => {
      setLoadingProgress((prev) => (prev >= 95 ? prev : Math.min(95, prev + 6)));
    }, 900);
    return () => window.clearInterval(interval);
  }, [state]);

  async function assess() {
    setState("loading");
    setResult(null);
    setLoadingProgress(5);
    try {
      const res = await fetch("/api/speaking/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transcript, mode, runtimeMode }),
      });
      const data = (await res.json().catch(() => ({}))) as AssessmentResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Assessment failed");
      setResult(data);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  if (!transcript.trim()) return null;
  if (runtimeMode === "intensive") return null;

  if (state === "idle") {
    if (hideAssessTrigger) return <p className="mt-3 text-sm text-slate-500">No report yet for this provider.</p>;
    return (
      <div className="sp-assess-trigger">
        <button type="button" className="sp-assess-trigger-btn" onClick={assess}>
          ✦ Generate report
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#004aad]">Building report</p>
        <p className="mt-1 text-sm text-slate-500">กำลังสร้างรายงานการพูด</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#004aad]" style={{ width: `${loadingProgress}%` }} />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <strong className="text-red-700">Report unavailable</strong>
        <p className="mt-1 text-sm text-red-600">{errorMsg}</p>
        <button type="button" className="sp-assess-trigger-btn mt-3" onClick={assess}>
          Retry
        </button>
      </div>
    );
  }

  if (!result) return null;

  const { reportCard } = result;
  const feedbackModelLabel =
    result.errorCode === "local_rubric" || !result.feedbackSource
      ? "English Plan"
      : result.feedbackSource === "gemini"
        ? "Gemini"
        : result.feedbackSource === "anthropic"
          ? "Claude"
          : "ChatGPT";
  const pronunciationIssues = result.criteria.pronunciation.mainIssues.filter((issue) => /\(\d+%\)$/.test(issue));
  const whisperTranscript = reportCard.preprocess.whisperTranscript?.trim() || "";

  return (
    <div className="mx-auto mt-6 max-w-4xl space-y-5 px-4 pb-12">
      <section className="rounded-xl bg-[#004aad] p-6 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ffcc00]">{feedbackModelLabel}</p>
        <h1 className="mt-2 text-3xl font-bold">Speaking Report</h1>
        <p className="mt-3 text-sm text-blue-100">{question}</p>
        <div className="mt-5 rounded-lg bg-white/10 p-4">
          <p className="text-sm font-semibold text-[#ffcc00]">Overall Band</p>
          <p className="mt-1 text-5xl font-black">{reportCard.scoreCalculation.roundedBand.toFixed(1)}</p>
          <p className="mt-3 text-sm">{reportCard.scoreCalculation.formula}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Scores" english="Component scores" />
        <ScoreRow label="Grammar" value={reportCard.scoreCalculation.grammar.toFixed(1)} />
        <ScoreRow label="Vocabulary" value={reportCard.scoreCalculation.vocabulary.toFixed(1)} />
        <ScoreRow label="Fluency" value={reportCard.scoreCalculation.fluency.toFixed(1)} />
        <ScoreRow
          label={`Pronunciation${reportCard.scoreCalculation.pronunciationConfidencePct ? ` · ${reportCard.scoreCalculation.pronunciationConfidencePct}%` : ""}`}
          value={reportCard.scoreCalculation.pronunciation.toFixed(1)}
          highlight
        />
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Punctuated Transcript" english="Script used for evaluation" />
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{reportCard.preprocess.punctuatedTranscript}</p>
        </div>
      </section>

      <BucketSection title="Grammar" subtitle="ไวยากรณ์" checklist={reportCard.buckets.grammar} />
      <BucketSection title="Vocabulary" subtitle="คำศัพท์" checklist={reportCard.buckets.vocabulary} />
      <BucketSection title="Fluency" subtitle="ความคล่องแคล่ว" checklist={reportCard.buckets.fluency} />

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Pronunciation" english="Whisper confidence details" />
        <ScoreRow
          label="Confidence"
          value={`${reportCard.scoreCalculation.pronunciationConfidencePct ?? "n/a"}%`}
          highlight
        />

        {pronunciationIssues.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pronunciationIssues.map((issue, idx) => (
              <QuoteChip key={`${issue}-${idx}`} quote={issue} tone="red" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No word-level low-confidence items available for this submission.</p>
        )}

        <EvidenceBox title="Whisper Transcript">
          <div className="whitespace-pre-wrap leading-7">
            {whisperTranscript
              ? renderHighlightedTranscript(whisperTranscript, pronunciationIssues)
              : reportCard.preprocess.punctuatedTranscript}
          </div>
        </EvidenceBox>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Step +1 Corrections" english="Simple fixes for the next band" />
        {reportCard.stepUpCorrections.map((correction, idx) => (
          <CorrectionCard key={idx} correction={correction} />
        ))}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={assess}
          className="rounded-lg bg-[#ffcc00] px-5 py-2.5 font-bold text-[#004aad] transition-colors hover:bg-yellow-400"
        >
          Re-assess
        </button>
      </div>
    </div>
  );
}
