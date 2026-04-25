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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  const feedbackColor =
    result.feedbackSource === "gemini"
      ? "#2563eb"
      : result.feedbackSource === "anthropic"
        ? "#f97316"
        : "#e2e8f0";
  const feedbackModelLabel =
    result.feedbackSource === "gemini"
      ? "Gemini"
      : result.feedbackSource === "anthropic"
        ? "Claude"
        : "ChatGPT";
  if (mode === "part-2" && result.reportV2) {
    const report = result.reportV2;
    const highlightTranscript = (() => {
      let html = escapeHtml(report.transcriptAnalysis.punctuatedTranscript);
      for (const item of report.pronunciation.lowConfidenceWords) {
        if (!item.heard) continue;
        const escaped = item.heard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");
        html = html.replace(
          regex,
          `<span style="background:#fee2e2;border-bottom:2px solid #ef4444;border-radius:4px;padding:0 4px;" title="AI confidence ${item.confidencePct}%">$&</span>`,
        );
      }
      return html;
    })();

    const speakWord = (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    };

    return (
      <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16, borderLeft: `8px solid ${feedbackColor}` }}>
        <section style={{ background: "#004aad", color: "white", borderRadius: 16, padding: 20, marginBottom: 16, position: "relative" }}>
          <div
            title="Feedback source"
            style={{
              position: "absolute",
              right: 20,
              top: 20,
              width: 16,
              height: 16,
              borderRadius: 9999,
              background: feedbackColor,
              border: "1px solid rgba(255,255,255,0.8)",
            }}
          />
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(255,255,255,0.88)" }}>
            MODEL USED: <strong style={{ color: "#ffcc00" }}>{feedbackModelLabel}</strong>
            {result.feedbackModel ? ` (${result.feedbackModel})` : ""}
          </p>
          <p style={{ color: "#ffcc00", fontWeight: 700, marginBottom: 8 }}>Part 2: พูดเดี่ยว 2 นาที</p>
          <h3 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>รายงานผลการประเมินการพูด</h3>
          <p style={{ opacity: 0.88, marginTop: 6, marginBottom: 10 }}>Speaking Assessment Report</p>
          <p style={{ background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: 10, marginBottom: 0 }}>
            <strong>หัวข้อ (Topic): </strong>{report.header.topicEn}
          </p>
          <div style={{ marginTop: 14, display: "inline-flex", background: "white", color: "#004aad", border: "4px solid #ffcc00", borderRadius: 9999, width: 90, height: 90, alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 30 }}>
            {report.header.overallBand.toFixed(1)}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginBottom: 16 }}>
          {report.rubricCards.map((card) => (
            <div key={card.key} style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h4 style={{ margin: 0, color: "#004aad", fontSize: 18, fontWeight: 800 }}>{card.titleTh}</h4>
                  <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 12 }}>{card.titleEn}</p>
                </div>
                <span style={{ background: "#004aad", color: "white", borderRadius: 9999, padding: "3px 10px", fontWeight: 700, fontSize: 13 }}>
                  Band {card.band.toFixed(1)}
                </span>
              </div>
              <div style={{ height: 8, background: "#e2e8f0", borderRadius: 9999, marginTop: 10 }}>
                <div style={{ width: `${card.progressPct}%`, background: "#004aad", height: 8, borderRadius: 9999 }} />
              </div>
              <p style={{ marginTop: 10, marginBottom: 6, fontSize: 14 }}>{card.feedbackTh}</p>
              <p style={{ marginTop: 0, color: "#64748b", fontSize: 12 }}>{card.feedbackEn}</p>
            </div>
          ))}
        </section>

        <section style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "#004aad", fontSize: 20, fontWeight: 800 }}>การวิเคราะห์บทพูด</h4>
          <p style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>Transcript Analysis</p>
          <p style={{ lineHeight: 1.8, marginTop: 12 }} dangerouslySetInnerHTML={{ __html: highlightTranscript }} />
          {report.transcriptAnalysis.transitionWords.length > 0 && (
            <p style={{ marginTop: 8, fontSize: 13 }}>
              <strong>Good transitions:</strong> {report.transcriptAnalysis.transitionWords.join(", ")}
            </p>
          )}
          {report.transcriptAnalysis.goodVocabulary.length > 0 && (
            <p style={{ marginTop: 8, fontSize: 13 }}>
              <strong>Good vocabulary:</strong> {report.transcriptAnalysis.goodVocabulary.join(", ")}
            </p>
          )}
        </section>

        <section style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "#004aad", fontSize: 20, fontWeight: 800 }}>การวิเคราะห์การออกเสียงเชิงลึกด้วย AI</h4>
          <p style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>Deep AI Pronunciation Analysis (Whisper)</p>
          <p style={{ lineHeight: 1.8, marginTop: 12 }} dangerouslySetInnerHTML={{ __html: highlightTranscript }} />
          <p style={{ marginTop: 8 }}>
            ความมั่นใจโดยรวมของ AI: <strong>{report.pronunciation.overallConfidencePct}%</strong>
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {report.pronunciation.lowConfidenceWords.map((w, idx) => (
              <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                <p style={{ margin: 0, fontSize: 13 }}>
                  <span style={{ color: "#059669", fontWeight: 700 }}>สิ่งที่คุณตั้งใจพูด:</span> {w.intended}
                  <span style={{ margin: "0 8px" }}>→</span>
                  <span style={{ color: "#dc2626", textDecoration: "line-through", fontWeight: 700 }}>สิ่งที่ AI ได้ยิน: {w.heard}</span>
                </p>
                <button
                  type="button"
                  onClick={() => speakWord(w.intended)}
                  style={{ marginTop: 8, border: "1px solid #cbd5e1", borderRadius: 8, background: "white", padding: "4px 8px", fontSize: 12, fontWeight: 700 }}
                >
                  ▶ Listen pronunciation
                </button>
                <div style={{ height: 7, background: "#e2e8f0", borderRadius: 9999, marginTop: 8 }}>
                  <div style={{ width: `${w.confidencePct}%`, background: "#f59e0b", height: 7, borderRadius: 9999 }} />
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>{w.confidencePct}% confidence</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "#004aad", fontSize: 20, fontWeight: 800 }}>Band rationale per criterion</h4>
          <p style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>Checklist-based reason for each criterion band</p>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {report.bandRationale.map((r, idx) => (
              <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                <p style={{ margin: 0, fontWeight: 800 }}>{r.title} · Band {r.currentBand.toFixed(1)}</p>
                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                  {r.checklistHits.map((hit, i) => (
                    <li key={i} style={{ fontSize: 13 }}>{hit}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "#004aad", fontSize: 20, fontWeight: 800 }}>Detected evidence</h4>
          <p style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>Factual evidence extracted from transcript/audio</p>
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
            {report.detectedEvidence.map((e, idx) => (
              <li key={idx} style={{ fontSize: 13 }}>{e}</li>
            ))}
          </ul>
        </section>

        <section style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "#004aad", fontSize: 20, fontWeight: 800 }}>Actionable fixes</h4>
          <p style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>Concrete step+1 improvements for next attempt</p>
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
            {report.actionableFixes.map((e, idx) => (
              <li key={idx} style={{ fontSize: 13 }}>{e}</li>
            ))}
          </ul>
        </section>

        <section style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "#004aad", fontSize: 20, fontWeight: 800 }}>Next Band Plan</h4>
          <p style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>Current band to next target with exact tasks</p>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {report.nextBandPlan.map((plan, idx) => (
              <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                <p style={{ margin: 0, fontWeight: 800 }}>
                  {plan.key}: {plan.currentBand.toFixed(1)} → {plan.targetBand.toFixed(1)}
                </p>
                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                  {plan.tasks.map((task, i) => (
                    <li key={i} style={{ fontSize: 13 }}>{task}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0", padding: 16 }}>
          <h4 style={{ margin: 0, color: "#004aad", fontSize: 22, fontWeight: 800 }}>จุดที่ต้องแก้ไขเพื่ออัพคะแนน</h4>
          <p style={{ marginTop: 2, color: "#64748b", fontSize: 12 }}>Corrections & Suggestions</p>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {report.corrections.map((c, idx) => (
              <div key={idx} style={{ position: "relative", background: "white", borderRadius: 10, border: "1px solid #e2e8f0", padding: 12 }}>
                <button type="button" style={{ position: "absolute", top: 12, right: 12, background: "#ffcc00", color: "#004aad", borderRadius: 8, border: "none", padding: "4px 8px", fontWeight: 700 }}>
                  Add to notebook
                </button>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginRight: 128 }}>
                  <span style={{ textDecoration: "line-through", color: "#ef4444", background: "#fef2f2", borderRadius: 6, padding: "2px 6px" }}>{c.wrong}</span>
                  <span style={{ color: "#004aad", fontWeight: 700 }}>→</span>
                  <span style={{ color: "#059669", background: "#ecfdf5", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>{c.right}</span>
                </div>
                <div style={{ borderLeft: "4px solid #004aad", marginTop: 10, paddingLeft: 10 }}>
                  <p style={{ margin: 0, fontSize: 14 }}>{c.reasonTh}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{c.reasonEn}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }
  const transcriptEvidence = [
    ...(result.criteria.fluencyCoherence.evidenceFromTranscript ?? []),
    ...(result.criteria.lexicalResource.evidenceFromTranscript ?? []),
    ...(result.criteria.grammarRangeAccuracy.evidenceFromTranscript ?? []),
    ...(result.criteria.pronunciation.evidence ?? []),
  ].slice(0, 12);

  return (
    <div className="sp-report">
      <ReportSection title="Band justification">
        <p className="sp-criterion-summary-en" style={{ borderLeft: `6px solid ${feedbackColor}`, paddingLeft: 8 }}>
          MODEL USED: {feedbackModelLabel}{result.feedbackModel ? ` (${result.feedbackModel})` : ""}
        </p>
        <div
          title="Feedback source"
          style={{
            width: 14,
            height: 14,
            borderRadius: 9999,
            background: feedbackColor,
            border: "1px solid #cbd5e1",
            marginBottom: 8,
          }}
        />
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
