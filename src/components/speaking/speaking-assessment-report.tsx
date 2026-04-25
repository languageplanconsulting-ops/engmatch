"use client";

import { useEffect, useState } from "react";
import type {
  AssessmentResult,
  BucketChecklist,
  StepUpCorrection,
} from "@/app/api/speaking/assess/route";

function SectionTitle({ thai, english }: { thai: string; english: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-xl font-semibold text-slate-900">{thai}</h3>
      <p className="text-sm text-slate-500">{english}</p>
    </div>
  );
}

function BucketColumn({
  title,
  subtitle,
  checklist,
}: {
  title: string;
  subtitle: string;
  checklist: BucketChecklist;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">{subtitle}</p>
          <p className="text-sm text-slate-500">{title}</p>
        </div>
        <div className="rounded-full bg-[#004aad] px-3 py-1 text-sm font-semibold text-white">
          Band {checklist.currentBand}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">สิ่งที่คุณทำได้</p>
          <p className="mb-2 text-xs text-slate-500">Achieved</p>
          <ul className="space-y-2">
            {checklist.achieved.map((item, idx) => (
              <li key={idx} className="rounded-xl bg-emerald-50 p-3">
                <p className="checklist-done text-sm font-semibold">{`✓ ${item.thai}`}</p>
                <p className="text-xs text-emerald-700">{item.english}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">เป้าหมายต่อไป</p>
          <p className="mb-2 text-xs text-slate-500">{`Target +1 Band (${checklist.nextTargetBand})`}</p>
          <ul className="space-y-2">
            {checklist.missingForNextBand.map((item, idx) => (
              <li key={idx} className="rounded-xl bg-amber-50 p-3">
                <p className="checklist-miss text-sm font-semibold">{`🔒 ${item.thai}`}</p>
                <p className="text-xs text-amber-700">{item.english}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CorrectionCard({ correction }: { correction: StepUpCorrection }) {
  const badgeLabel =
    correction.type === "grammar"
      ? "Grammar"
      : correction.type === "vocabulary"
        ? "Vocabulary"
        : "Fluency";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
        {`${badgeLabel}: Target Band ${correction.targetBand}`}
      </div>

      {correction.type === "fluency" ? (
        <div className="rounded-xl bg-sky-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Suggestion to add</p>
          <p className="mt-2 text-sm text-slate-700">{correction.suggestionToAdd ?? "-"}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <span className="text-red-600 line-through decoration-2">{correction.originalText ?? "-"}</span>
          <span className="mx-3 text-lg text-[#004aad]">→</span>
          <span className="font-semibold text-emerald-700 underline decoration-2 underline-offset-2">
            {correction.improvedText ?? "-"}
          </span>
        </div>
      )}

      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold text-slate-900">{correction.thaiExplanation}</p>
        <p className="text-sm text-slate-500">{correction.englishExplanation}</p>
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
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(() =>
    seedResult ? "done" : "idle",
  );
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
    if (hideAssessTrigger) {
      return <p className="mt-3 text-sm text-slate-500">No report yet for this provider.</p>;
    }
    return (
      <div className="sp-assess-trigger">
        <button type="button" className="sp-assess-trigger-btn" onClick={assess}>
          ✦ Generate bilingual bucket-list report
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#004aad]">English Plan Speaking Intelligence</p>
        <h4 className="mt-1 text-xl font-semibold text-slate-900">Building your bilingual bucket-list report</h4>
        <p className="mt-1 text-sm text-slate-500">กำลังประมวลผล transcript, bucket checklist และ step-up corrections</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#004aad]" style={{ width: `${loadingProgress}%` }} />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <strong className="text-red-700">English Plan feedback temporarily unavailable</strong>
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
      ? "English Plan Rubric Engine"
      : result.feedbackSource === "gemini"
        ? "Gemini"
        : result.feedbackSource === "anthropic"
          ? "Claude"
          : "ChatGPT";

  return (
    <div className="space-y-6 rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#ffffff_38%,#f8fafc_100%)] p-4 shadow-sm md:p-6">
      <div className="overflow-hidden rounded-[28px] border border-[#003a87] bg-[#004aad] text-white shadow-lg">
        <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02))] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ffcc00]">Speaking Report</p>
              <p className="mt-2 text-2xl font-semibold leading-tight">{reportCard.topicName}</p>
              <p className="mt-2 text-sm text-blue-100">
                {`รายงานประเมินการพูดแบบ bilingual bucket-list · ${feedbackModelLabel}${result.feedbackModel ? ` (${result.feedbackModel})` : ""}`}
              </p>
            </div>
            <div className="rounded-[24px] bg-[#ffcc00] px-5 py-4 text-slate-900 shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Final Overall Band</p>
              <p className="mt-2 text-4xl font-bold">{reportCard.scoreCalculation.roundedBand.toFixed(1)}</p>
              <p className="mt-1 text-xs">{`Exact average ${reportCard.scoreCalculation.exactAverage.toFixed(2)}`}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-[24px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold text-[#ffcc00]">Score Calculation Formula</p>
              <p className="mt-2 text-sm font-medium leading-7">{reportCard.scoreCalculation.formula}</p>
              <p className="mt-2 text-xs text-blue-100">
                {`Grammar ${reportCard.scoreCalculation.grammar} · Vocabulary ${reportCard.scoreCalculation.vocabulary} · Fluency ${reportCard.scoreCalculation.fluency} · Pronunciation ${reportCard.scoreCalculation.pronunciation}`}
              </p>
              <p className="mt-1 text-xs text-blue-100">
                คะแนนรวมคำนวณจาก 4 องค์ประกอบ แล้วปัดตามกติกา overall band
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <p className="text-sm font-semibold text-[#ffcc00]">Grammar</p>
                <p className="mt-2 text-2xl font-bold">{reportCard.scoreCalculation.grammar.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <p className="text-sm font-semibold text-[#ffcc00]">Vocabulary</p>
                <p className="mt-2 text-2xl font-bold">{reportCard.scoreCalculation.vocabulary.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <p className="text-sm font-semibold text-[#ffcc00]">Fluency</p>
                <p className="mt-2 text-2xl font-bold">{reportCard.scoreCalculation.fluency.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <p className="text-sm font-semibold text-[#ffcc00]">Pronunciation</p>
                <p className="mt-2 text-2xl font-bold">{reportCard.scoreCalculation.pronunciation.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-blue-100">
            {`Pronunciation confidence: ${reportCard.scoreCalculation.pronunciationConfidencePct ?? "n/a"}%`}
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="AI Pre-processing" english="Raw ASR transcript vs. punctuated transcript" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              Raw ASR
            </div>
            <p className="text-lg font-semibold text-slate-900">ข้อความดิบจากระบบถอดเสียง</p>
            <p className="mt-1 text-sm text-slate-500">Raw ASR transcript</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{reportCard.preprocess.rawTranscript}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-3 inline-flex rounded-full bg-[#004aad] px-3 py-1 text-xs font-semibold text-white">
              Punctuated
            </div>
            <p className="text-lg font-semibold text-slate-900">เวอร์ชันที่เติมวรรคตอนแล้ว</p>
            <p className="mt-1 text-sm text-slate-500">Punctuated transcript</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{reportCard.preprocess.punctuatedTranscript}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Bucket List Checklists" english="Grammar, vocabulary, and fluency buckets" />
        <div className="grid gap-4 lg:grid-cols-3">
          <BucketColumn title="Grammar" subtitle="ไวยากรณ์" checklist={reportCard.buckets.grammar} />
          <BucketColumn title="Vocabulary" subtitle="คำศัพท์" checklist={reportCard.buckets.vocabulary} />
          <BucketColumn title="Fluency" subtitle="ความคล่องแคล่ว" checklist={reportCard.buckets.fluency} />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Pronunciation Logic" english="Kept with Whisper AI confidence scoring" />
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-blue-100 bg-[linear-gradient(180deg,#eff6ff,#ffffff)] p-5">
            <p className="text-base font-semibold text-slate-900">คะแนนการออกเสียง</p>
            <p className="mt-1 text-sm text-slate-500">Pronunciation score</p>
            <p className="mt-3 text-5xl font-bold text-[#004aad]">{result.criteria.pronunciation.band.toFixed(1)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-base font-semibold text-slate-900">{result.criteria.pronunciation.thaiExplanation}</p>
            <p className="mt-1 text-sm text-slate-500">{result.criteria.pronunciation.englishExplanation}</p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
              {(result.criteria.pronunciation.evidence ?? []).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Step +1 Corrections" english="Corrections based only on the missing buckets" />
        <div className="space-y-4">
          {reportCard.stepUpCorrections.map((correction, idx) => (
            <CorrectionCard key={idx} correction={correction} />
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle thai="Overall Summary" english="Bilingual examiner summary" />
        <p className="text-lg font-semibold leading-8 text-slate-900">{result.overall.thaiSummary}</p>
        <p className="mt-2 text-sm leading-7 text-slate-500">{result.overall.englishSummary}</p>
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-400">{result.overall.reliabilityWarning}</p>
        {result.errorCode === "fallback" && (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
            {result.fallbackReason ?? "Fallback estimate only."}
          </p>
        )}
      </div>

      <button type="button" className="sp-reassess-btn" onClick={assess}>
        ↺ Re-assess
      </button>
    </div>
  );
}
