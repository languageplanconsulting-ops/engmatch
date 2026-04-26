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
    <div>
      <h2 className="inline-block border-b-2 border-[#ffcc00] pb-2 text-2xl font-bold text-slate-800">{thai}</h2>
      <p className="mt-2 text-sm text-slate-500">{english}</p>
    </div>
  );
}

function MicroIcon({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "yellow" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "yellow"
      ? "bg-[#ffcc00] text-[#004aad]"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : tone === "amber"
          ? "bg-amber-100 text-amber-700"
          : "bg-[#004aad] text-white";
  return <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${toneClass}`}>{label}</span>;
}

function QuoteChip({ quote, tone = "slate" }: { quote: string; tone?: "emerald" | "amber" | "blue" | "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-100 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-100 text-amber-900"
        : tone === "blue"
          ? "border-blue-200 bg-blue-100 text-blue-900"
          : "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>{quote}</span>;
}

function QuoteBox({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "red";
}) {
  const toneClass =
    tone === "red"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-300 bg-slate-100 text-slate-600";
  return <div className={`mt-2 rounded-r-md border-l-[3px] px-3 py-2 text-sm italic ${toneClass}`}>{children}</div>;
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

  const pattern = words.map(escapeRegExp).join("|");
  if (!pattern) return transcript;
  const regex = new RegExp(`(${pattern})`, "gi");
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

function ScoreTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`relative rounded-xl border p-4 text-center shadow-sm ${highlight ? "border-[#004aad]/20 bg-[#004aad]/5" : "border-slate-200 bg-white"}`}>
      {highlight && <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-[#004aad]" />}
      <p className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${highlight ? "text-[#004aad]" : "text-slate-500"}`}>{label}</p>
      <p className={`text-2xl font-black ${highlight ? "text-[#004aad]" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function BucketChecklistItem({
  item,
  state,
}: {
  item: BilingualBullet;
  state: "achieved" | "target";
}) {
  const isAchieved = state === "achieved";
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 text-lg ${isAchieved ? "checklist-done" : "checklist-miss"}`}>{isAchieved ? "●" : "◐"}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">{item.thai}</p>
        <p className="text-xs text-slate-500">{item.english}</p>

        {item.evidenceQuotes && item.evidenceQuotes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.evidenceQuotes.map((quote, idx) => (
              <QuoteChip key={`${quote}-${idx}`} quote={quote} tone={isAchieved ? "emerald" : "amber"} />
            ))}
          </div>
        )}

        {(item.evidenceThai || item.evidenceEnglish) && (
          <QuoteBox tone={isAchieved ? "slate" : "red"}>
            <p className="font-semibold not-italic text-slate-900">Evidence</p>
            {item.evidenceThai && <p className="mt-1">{item.evidenceThai}</p>}
            {item.evidenceEnglish && <p className="mt-1">{item.evidenceEnglish}</p>}
          </QuoteBox>
        )}

        {!isAchieved && (
          <div className="mt-2 space-y-2">
            {item.suggestedVocabulary && (
              <p className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#004aad]">
                Vocab to use: {item.suggestedVocabulary}
              </p>
            )}
            {item.suggestedFix && (
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Suggested Fix</p>
                <p className="mt-1 text-sm text-slate-700">{item.suggestedFix}</p>
              </div>
            )}
            {item.suggestedSentence && (
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Suggested Sentence</p>
                <p className="mt-1 text-sm italic text-slate-700">{item.suggestedSentence}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BucketCard({
  title,
  subtitle,
  checklist,
  iconLabel,
}: {
  title: string;
  subtitle: string;
  checklist: BucketChecklist;
  iconLabel: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-[#004aad] p-4 text-white">
        <h3 className="flex items-center gap-2 font-bold">
          <MicroIcon label={iconLabel} tone="yellow" />
          <span>{`${subtitle} (${title})`}</span>
        </h3>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#004aad] shadow-sm">
          {`Band ${checklist.currentBand.toFixed(1)}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">สิ่งที่คุณทำได้ (Achieved)</p>
        <div className="space-y-4">
          {checklist.achieved.map((item, idx) => (
            <BucketChecklistItem key={idx} item={item} state="achieved" />
          ))}
        </div>

        <div className="mt-auto -mx-5 mt-6 border-t border-slate-100 bg-amber-50/30 px-5 pb-2 pt-4">
          <p className="mb-3 flex items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            <span>◎</span>
            <span>{`เป้าหมายต่อไป: Band ${checklist.nextTargetBand.toFixed(1)}`}</span>
          </p>
          <div className="space-y-4">
            {checklist.missingForNextBand.map((item, idx) => (
              <BucketChecklistItem key={idx} item={item} state="target" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PronunciationWordCard({ issue }: { issue: string }) {
  const match = issue.match(/^(.*)\((\d+)%\)$/);
  const word = match?.[1]?.trim() || issue;
  const pct = match?.[2] ? Number(match[2]) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="w-1/2 text-left">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Word</p>
          <p className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-center font-bold text-emerald-700">
            {word}
          </p>
        </div>
        <span className="shrink-0 text-slate-400">→</span>
        <div className="w-1/2 text-right">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Confidence</p>
          <p className="rounded-lg border border-rose-200 bg-rose-100 px-3 py-1.5 text-center font-bold text-rose-700">
            {pct !== null ? `${pct}%` : "low"}
          </p>
        </div>
      </div>
      {pct !== null && (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-center text-xs font-medium text-slate-500">{`Confidence: ${pct}%`}</p>
        </>
      )}
    </div>
  );
}

function CorrectionCard({ correction }: { correction: StepUpCorrection }) {
  const badgeClass =
    correction.type === "grammar"
      ? "border-indigo-200 bg-indigo-100 text-indigo-800"
      : correction.type === "vocabulary"
        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
        : "border-amber-200 bg-amber-100 text-amber-800";
  const accentClass =
    correction.type === "grammar"
      ? "border-[#004aad] bg-blue-50/50"
      : correction.type === "vocabulary"
        ? "border-emerald-500 bg-emerald-50/50"
        : "border-amber-500 bg-amber-50/50";
  const badgeLabel =
    correction.type === "grammar"
      ? "Grammar"
      : correction.type === "vocabulary"
        ? "Vocab"
        : "Fluency";

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className={`absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl border-b border-l px-3 py-1 text-xs font-bold ${badgeClass}`}>
        <span>{badgeLabel}</span>
        <span>{`Target Band ${correction.targetBand}`}</span>
      </div>

      {correction.type === "fluency" ? (
        <div className="mb-4 mt-6">
          <p className="mb-2 text-sm font-bold text-slate-800">ขยายคำตอบให้ยาวขึ้น (Extend the answer)</p>
          <div className="rounded-lg border border-amber-200 border-dashed bg-amber-50 p-4">
            <p className="text-sm font-medium italic text-amber-800">
              <strong>Suggestion to add:</strong> {correction.suggestionToAdd ?? "-"}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center">
            <span className="rounded-md border border-rose-100 bg-rose-50 px-3 py-1.5 text-rose-600 line-through decoration-2">
              {correction.originalText ?? "-"}
            </span>
            <span className="text-lg font-bold text-[#004aad]">→</span>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 underline decoration-2 underline-offset-4">
              {correction.improvedText ?? "-"}
            </span>
          </div>
        </div>
      )}

      <div className={`rounded-r-lg border-l-4 ${accentClass} py-2 pl-4`}>
        <p className="text-sm font-bold text-slate-900">{correction.thaiExplanation}</p>
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
  const pronunciationIssues = result.criteria.pronunciation.mainIssues.filter((issue) => /\(\d+%\)$/.test(issue));
  const whisperTranscript = reportCard.preprocess.whisperTranscript?.trim() || "";

  return (
    <div className="mx-auto mt-6 max-w-6xl space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">{`Home / Speaking / ${mode.toUpperCase().replace("-", " ")} / Report`}</p>
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#ffcc00]" />
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#004aad]">{`${mode.toUpperCase().replace("-", " ")} · Speaking prompt`}</h2>
            <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
              <span>●</span>
              <span>Report ready</span>
            </span>
          </div>
          <p className="text-lg font-medium leading-relaxed text-slate-800">{question}</p>
        </div>
      </div>

      <header className="relative overflow-hidden rounded-2xl bg-[#004aad] p-8 text-white shadow-lg">
        <div className="absolute right-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="w-full text-center md:w-2/3 md:text-left">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#ffcc00]">
              {`รายงานประเมินการพูดแบบ Bilingual Bucket-List · ${feedbackModelLabel}${result.feedbackModel ? ` (${result.feedbackModel})` : ""}`}
            </p>
            <h1 className="mb-3 text-4xl font-extrabold">Speaking Report</h1>
            <div className="mt-2 inline-block rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-white/90">
                <span>◎</span>
                <span>สูตรคำนวณ (Score Calculation)</span>
              </p>
              <p className="text-lg font-bold">
                {reportCard.scoreCalculation.formula}
              </p>
              <p className="mt-1 text-xs text-white/70">คะแนนรวมคำนวณจาก 4 องค์ประกอบ แล้วปัดตามกติกา Overall Band</p>
            </div>
          </div>

          <div className="relative z-10 flex h-48 w-48 shrink-0 rotate-2 flex-col items-center justify-center rounded-[2rem] border-8 border-[#ffcc00]/90 bg-white text-[#004aad] shadow-2xl transition-transform hover:rotate-0">
            <span className="text-center text-sm font-bold leading-tight">
              คะแนนรวม
              <br />
              <span className="text-xs font-normal text-slate-500">Overall Band</span>
            </span>
            <span className="-mt-2 text-7xl font-black tracking-tighter">{reportCard.scoreCalculation.roundedBand.toFixed(1)}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ScoreTile label="Grammar" value={reportCard.scoreCalculation.grammar.toFixed(1)} />
        <ScoreTile label="Vocabulary" value={reportCard.scoreCalculation.vocabulary.toFixed(1)} />
        <ScoreTile label="Fluency" value={reportCard.scoreCalculation.fluency.toFixed(1)} />
        <ScoreTile
          label={`Pronunciation${reportCard.scoreCalculation.pronunciationConfidencePct ? ` · ${reportCard.scoreCalculation.pronunciationConfidencePct}%` : ""}`}
          value={reportCard.scoreCalculation.pronunciation.toFixed(1)}
          highlight
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionTitle thai="AI Pre-processing" english="เวอร์ชันที่เติมวรรคตอนแล้วสำหรับการประเมิน (Punctuated transcript used for evaluation)" />
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
          <p className="text-sm font-medium leading-loose text-justify text-indigo-950">{reportCard.preprocess.punctuatedTranscript}</p>
        </div>
      </div>

      <div className="mt-12">
        <SectionTitle
          thai="Bucket List Checklists"
          english="ประเมินจุดแข็งและสิ่งที่ขาดหายอ้างอิงจากสิ่งที่พูดจริง (Evaluation based on exact quotes)"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <BucketCard title="Grammar" subtitle="ไวยากรณ์" checklist={reportCard.buckets.grammar} iconLabel="Aa" />
        <BucketCard title="Vocabulary" subtitle="คำศัพท์" checklist={reportCard.buckets.vocabulary} iconLabel="Bk" />
        <BucketCard title="Fluency" subtitle="ความคล่องแคล่ว" checklist={reportCard.buckets.fluency} iconLabel="Fl" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#004aad]">
              <MicroIcon label="Pr" tone="blue" />
              <span>การวิเคราะห์การออกเสียงเชิงลึก (Pronunciation)</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">Pronunciation Logic kept with Whisper AI confidence scoring</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#004aad]">{`${reportCard.scoreCalculation.pronunciationConfidencePct ?? "n/a"}%`}</p>
            <p className="text-xs text-slate-500">ความมั่นใจโดยรวม<br />(Confidence)</p>
          </div>
        </div>

        <p className="mb-6 text-sm font-medium text-slate-700">{result.criteria.pronunciation.thaiExplanation} ({result.criteria.pronunciation.englishExplanation})</p>

        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-rose-600">
          <span>◐</span>
          <span>Words below 90% confidence (จุดที่ AI ฟังไม่ชัด)</span>
        </h3>

        {pronunciationIssues.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pronunciationIssues.map((issue, idx) => (
              <PronunciationWordCard key={`${issue}-${idx}`} issue={issue} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>ยังไม่มี word-level confidence สำหรับ submission นี้ หรือ Whisper ไม่ได้ส่งคำที่ต่ำกว่า 90% มาให้แสดง</p>
            <p className="mt-1">Word-level confidence is unavailable for this submission, or Whisper did not return any words below 90% confidence.</p>
          </div>
        )}

        <div className="mt-8">
          <p className="mb-2 text-sm font-bold text-slate-800">Whisper Transcript</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="whitespace-pre-wrap text-sm font-medium leading-loose text-slate-700">
              {whisperTranscript
                ? renderHighlightedTranscript(whisperTranscript, pronunciationIssues)
                : reportCard.preprocess.punctuatedTranscript}
            </p>
          </div>
          {whisperTranscript ? (
            <p className="mt-2 text-xs text-slate-500">Words with confidence below 90% are highlighted in red.</p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Whisper full transcript is unavailable for this submission, so the report shows the evaluated punctuated transcript instead.
            </p>
          )}
        </div>

        <ul className="mt-6 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          {(result.criteria.pronunciation.evidence ?? []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-10">
        <h2 className="mb-1 text-2xl font-bold text-[#004aad]">Step +1 Corrections</h2>
        <p className="mb-8 text-sm text-slate-500">การแก้ไขเฉพาะจุดที่ช่วยเติมเต็ม Missing Buckets</p>

        <div className="space-y-6">
          {reportCard.stepUpCorrections.map((correction, idx) => (
            <CorrectionCard key={idx} correction={correction} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-slate-200 pt-6 sm:justify-end">
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
          Try again
        </button>
        <button type="button" onClick={assess} className="rounded-lg border border-yellow-400 bg-[#ffcc00] px-5 py-2.5 font-bold text-[#004aad] shadow-sm transition-colors hover:bg-yellow-400">
          Re-assess
        </button>
      </div>
    </div>
  );
}
