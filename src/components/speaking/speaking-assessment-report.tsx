"use client";

import { useEffect, useState } from "react";
import type { AssessmentResult, CriterionDetail } from "@/app/api/speaking/assess/route";

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sp-report-section">
      <h3 className="sp-report-section-title">{title}</h3>
      {children}
    </section>
  );
}

function CriterionBlock({ title, detail }: { title: string; detail: CriterionDetail }) {
  const evidence = detail.evidenceFromTranscript ?? detail.evidence ?? [];
  return (
    <div className="sp-criterion-section">
      <div className="sp-criterion-header">
        <p className="sp-criterion-label">{title}</p>
        <strong className="sp-criterion-score">{detail.band.toFixed(1)}</strong>
      </div>
      <p className="sp-criterion-summary-en">{detail.englishExplanation}</p>
      <p className="sp-criterion-summary-th">{detail.thaiExplanation}</p>
      {evidence.length > 0 && (
        <ul className="sp-bullet-list">
          {evidence.map((item, idx) => (
            <li key={idx} className="sp-bullet-item">{item}</li>
          ))}
        </ul>
      )}
      {detail.mainIssues.length > 0 && (
        <p className="sp-criterion-summary-th">Issues: {detail.mainIssues.join(" | ")}</p>
      )}
      {detail.howToImprove.english.length > 0 && (
        <ul className="sp-bullet-list">
          {detail.howToImprove.english.map((tip, idx) => (
            <li key={idx} className="sp-bullet-item">{tip}</li>
          ))}
        </ul>
      )}
      {detail.howToImprove.thai.length > 0 && (
        <ul className="sp-bullet-list">
          {detail.howToImprove.thai.map((tip, idx) => (
            <li key={idx} className="sp-bullet-item">{tip}</li>
          ))}
        </ul>
      )}
      {detail.limitation && <p className="sp-criterion-summary-th">{detail.limitation}</p>}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function SpeakingAssessmentReport({
  question,
  transcript,
  mode,
  runtimeMode,
}: {
  question: string;
  transcript: string;
  mode: "part-1" | "part-2" | "part-3";
  runtimeMode?: "mock" | "practice" | "intensive";
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(1);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  const loadingSteps = [
    {
      en: "Getting your grammar signals",
      th: "กำลังดึงสัญญาณด้านไวยากรณ์ของคุณ",
    },
    {
      en: "Checking your vocabulary range",
      th: "กำลังตรวจช่วงคำศัพท์ที่คุณใช้",
    },
    {
      en: "Measuring fluency and flow",
      th: "กำลังวัดความคล่องและความลื่นไหลในการพูด",
    },
    {
      en: "Comparing with official IELTS band descriptors",
      th: "กำลังเทียบกับเกณฑ์ Band Description อย่างเป็นทางการของ IELTS",
    },
    {
      en: "Building personalized next-step coaching",
      th: "กำลังสร้างแผนโค้ชเฉพาะตัวสำหรับครั้งถัดไป",
    },
    {
      en: "Highlighting your strengths and weaknesses",
      th: "กำลังสรุปจุดแข็งและจุดที่ควรพัฒนา",
    },
    {
      en: "Preparing feedback as if P'Doy is beside you",
      th: "กำลังเตรียมฟีดแบ็กเหมือนพี่ดอยนั่งติวอยู่ข้างๆ",
    },
  ];

  useEffect(() => {
    if (state !== "loading") return;

    const interval = window.setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return prev;
        const delta = Math.max(1, Math.round((100 - prev) / 15));
        return Math.min(95, prev + delta);
      });
      setLoadingStepIdx((prev) => (prev + 1) % loadingSteps.length);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [state, loadingSteps.length]);

  async function assess() {
    setState("loading");
    setResult(null);
    setLoadingProgress(3);
    setLoadingStepIdx(0);
    try {
      const res = await fetch("/api/speaking/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transcript, mode, runtimeMode }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          providerFailures?: string[];
          providerDiagnostics?: Array<{
            provider?: string;
            model?: string;
            keyDetected?: boolean;
            keyName?: string | null;
            stage?: string;
            errorCode?: string;
            message?: string;
            status?: number;
            responseSnippet?: string;
          }>;
        };
        const providerMsg = Array.isArray(j.providerFailures) && j.providerFailures.length
          ? `\nProvider failures: ${j.providerFailures.join(" | ")}`
          : "";
        const diagnosticsMsg = Array.isArray(j.providerDiagnostics) && j.providerDiagnostics.length
          ? `\nDiagnostics:\n${j.providerDiagnostics
            .map((d) =>
              [
                `- ${d.provider ?? "unknown"} (${d.model ?? "unknown-model"})`,
                `stage=${d.stage ?? "unknown"}`,
                `code=${d.errorCode ?? "unknown"}`,
                `key=${d.keyDetected ? `present:${d.keyName ?? "detected"}` : "missing"}`,
                d.status ? `status=${d.status}` : "",
                d.message ? `msg=${d.message}` : "",
                d.responseSnippet ? `snippet=${d.responseSnippet}` : "",
              ].filter(Boolean).join(" | "),
            )
            .join("\n")}`
          : "";
        throw new Error((j.error ?? "Assessment failed") + providerMsg + diagnosticsMsg);
      }
      const data = (await res.json()) as AssessmentResult;
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
    return (
      <div className="sp-assess-trigger">
        <button type="button" className="sp-assess-trigger-btn" onClick={assess}>
          ✦ Get personalized feedback from English Plan&apos;s 6 years of speaking database
        </button>
      </div>
    );
  }

  if (state === "loading") {
    const activeStep = loadingSteps[loadingStepIdx];
    return (
      <div className="sp-assess-loading-card">
        <div className="sp-assess-loading-head">
          <div>
            <p className="sp-assess-loading-kicker">English Plan Speaking Intelligence</p>
            <h4 className="sp-assess-loading-title">Analyzing with 6 years of speaking database</h4>
            <p className="sp-assess-loading-title-th">กำลังวิเคราะห์ด้วยฐานข้อมูลการพูดของ English Plan ตลอด 6 ปี</p>
          </div>
          <strong className="sp-assess-loading-percent">{loadingProgress}%</strong>
        </div>

        <div className="sp-assess-loading-progress" aria-hidden="true">
          <span style={{ width: `${loadingProgress}%` }} />
        </div>

        <div className="sp-assess-loading-active">
          <span className="sp-assess-spinner" aria-hidden="true" />
          <div>
            <p>{activeStep.en}</p>
            <p>{activeStep.th}</p>
          </div>
        </div>

        <ul className="sp-assess-loading-list">
          {loadingSteps.slice(0, 5).map((step, idx) => {
            const isDone = idx < loadingStepIdx;
            const isCurrent = idx === loadingStepIdx;
            return (
              <li key={step.en} className={`sp-assess-loading-item${isCurrent ? " is-current" : ""}`}>
                <span>{isDone ? "✓" : isCurrent ? "•" : "○"}</span>
                <div>
                  <p>{step.en}</p>
                  <p>{step.th}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="sp-assess-error">
        <strong>English Plan feedback temporarily unavailable</strong>
        <p>{errorMsg}</p>
        <button type="button" className="sp-assess-trigger-btn" onClick={assess}>Retry</button>
      </div>
    );
  }

  if (!result) return null;
  const transcriptEvidence = [
    ...(result.criteria.fluencyCoherence.evidenceFromTranscript ?? []),
    ...(result.criteria.lexicalResource.evidenceFromTranscript ?? []),
    ...(result.criteria.grammarRangeAccuracy.evidenceFromTranscript ?? []),
    ...(result.criteria.pronunciation.evidence ?? []),
  ].slice(0, 12);

  return (
    <div className="sp-report">
      <ReportSection title="Band justification">
        <p className="sp-criterion-summary-en">{result.overall.englishSummary}</p>
        <p className="sp-criterion-summary-th">{result.overall.thaiSummary}</p>
        <p className="sp-criterion-summary-en">
          Band: {result.overall.roundedBand.toFixed(1)} (raw {result.overall.rawAverage.toFixed(1)}, confidence: {result.overall.confidence})
        </p>
        {result.overall.reliabilityWarning && <p className="sp-criterion-summary-th">{result.overall.reliabilityWarning}</p>}
      </ReportSection>

      <ReportSection title="Subskill breakdown">
        <div className="sp-criteria-stack">
          <CriterionBlock title="Fluency and Coherence" detail={result.criteria.fluencyCoherence} />
          <CriterionBlock title="Lexical Resource" detail={result.criteria.lexicalResource} />
          <CriterionBlock title="Grammatical Range and Accuracy" detail={result.criteria.grammarRangeAccuracy} />
          <CriterionBlock title="Pronunciation" detail={result.criteria.pronunciation} />
        </div>
      </ReportSection>

      <ReportSection title="Exact transcript evidence">
        <ul className="sp-bullet-list">
          {transcriptEvidence.map((item, idx) => (
            <li key={idx} className="sp-bullet-item">{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="Repeated error patterns">
        <ul className="sp-bullet-list">
          {[
            ...result.criteria.fluencyCoherence.mainIssues,
            ...result.criteria.lexicalResource.mainIssues,
            ...result.criteria.grammarRangeAccuracy.mainIssues,
            ...result.criteria.pronunciation.mainIssues,
          ].slice(0, 12).map((item, idx) => (
            <li key={idx} className="sp-bullet-item">{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="Sentence-level corrections">
        <ul className="sp-bullet-list">
          {result.grammarCorrections.map((row, idx) => (
            <li key={idx} className="sp-bullet-item">
              <strong>{row.original}</strong> → {row.corrected} ({row.thaiExplanation})
            </li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="Vocabulary replacement table">
        <ul className="sp-bullet-list">
          {result.vocabularyUpgrades.map((row, idx) => (
            <li key={idx} className="sp-bullet-item">
              <strong>{row.original}</strong> → {row.better} ({row.thaiExplanation})
            </li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="Band 6 -> Band 7 upgrade advice">
        <ul className="sp-bullet-list">
          {result.priorityActions.map((row, idx) => (
            <li key={idx} className="sp-bullet-item">{row.english} | {row.thai}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection title="Improved sample answer">
        <p className="sp-criterion-summary-en">{result.sampleImprovedAnswer.english}</p>
        <p className="sp-criterion-summary-th">{result.sampleImprovedAnswer.thaiNote}</p>
      </ReportSection>

      <button type="button" className="sp-reassess-btn" onClick={assess}>
        ↺ Re-assess
      </button>
    </div>
  );
}
