"use client";

import { useCallback, useState } from "react";
import type { SpeakingHealthCheck, SpeakingHealthResult } from "@/lib/speaking-admin-health";

export function SpeakingAdminHealthPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SpeakingHealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/speaking-report?systemHealth=1", { cache: "no-store" });
      const json = (await res.json()) as SpeakingHealthResult & { error?: string };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : `HTTP ${res.status}`);
        setData(null);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="sp-admin-health" aria-labelledby="sp-admin-health-title">
      <div className="sp-admin-health-head">
        <div>
          <h3 id="sp-admin-health-title">System check · ตรวจระบบ Speaking</h3>
          <p className="sp-admin-health-desc">
            No microphone needed. This checks provider keys for Gemini, Claude, and ChatGPT, runs one real assess
            request, then verifies optional <code>DEEPGRAM_API_KEY</code> and the speaking database.
          </p>
        </div>
        <button type="button" className="sp-admin-health-btn" onClick={() => void run()} disabled={loading}>
          {loading ? "Running…" : "Run checks"}
        </button>
      </div>

      {error && (
        <div className="status-banner" role="alert">
          <strong>Request failed</strong>
          <p>{error}</p>
        </div>
      )}

      {data && (
        <>
          <div className={`sp-admin-health-summary${data.allCriticalOk ? " is-ok" : " is-bad"}`}>
            <strong>{data.allCriticalOk ? "All critical checks passed" : "Some critical checks failed"}</strong>
            <span>{new Date(data.at).toLocaleString()}</span>
          </div>
          <ul className="sp-admin-health-list">
            {data.checks.map((c: SpeakingHealthCheck) => (
              <li key={c.id} className={`sp-admin-health-item${c.ok ? "" : " is-fail"}`}>
                <div className="sp-admin-health-item-top">
                  <span className="sp-admin-health-label">{c.label}</span>
                  <span className="sp-admin-health-badges">
                    <span className={`sp-admin-health-tag${c.ok ? " is-ok" : " is-bad"}`}>{c.ok ? "OK" : "Fail"}</span>
                    {c.optional && <span className="sp-admin-health-tag is-muted">optional</span>}
                    {c.id === "speaking_assess" && c.ok && c.fullAi === true && (
                      <span className="sp-admin-health-tag is-ai">Full AI</span>
                    )}
                    {c.id === "speaking_assess" && c.ok && c.fullAi === false && (
                      <span className="sp-admin-health-tag is-warn">Fallback</span>
                    )}
                  </span>
                </div>
                <p className="sp-admin-health-detail">{c.detail ?? "—"}</p>
                {typeof c.ms === "number" && <p className="sp-admin-health-ms">{c.ms} ms</p>}
              </li>
            ))}
          </ul>
          <p className="sp-admin-health-foot">
            <strong>Fallback</strong> means every configured provider failed during assessment, so the app returned a
            conservative estimate instead of a real AI report.
          </p>
        </>
      )}
    </section>
  );
}
