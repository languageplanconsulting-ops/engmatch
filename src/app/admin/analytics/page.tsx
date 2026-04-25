"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProviderStat = {
  provider: string;
  calls: number;
  success: number;
  fail: number;
  successRate: number;
  estimatedCostUsd: number;
};

type Payload = {
  monthStart: string;
  totalCalls: number;
  totalCostUsd: number;
  providers: ProviderStat[];
};

export default function AdminBusinessAnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const res = await fetch("/api/admin/analytics/business", { cache: "no-store" });
        const json = (await res.json()) as Payload & { error?: string };
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="stack-lg">
      <nav className="breadcrumbs">
        <span><Link href="/">Home</Link> / </span>
        <span><Link href="/admin">Admin</Link> / </span>
        <span>Business Analytics</span>
      </nav>

      <div className="section-header">
        <h2>Business Analytics</h2>
        <p>Monthly AI API usage and estimated spend for speaking assessment.</p>
      </div>

      {loading ? (
        <div className="status-banner"><strong>Loading analytics...</strong></div>
      ) : error ? (
        <div className="status-banner"><strong>Failed</strong><p>{error}</p></div>
      ) : data ? (
        <>
          <div className="list-grid">
            <article className="list-card">
              <h3>Total API calls (month)</h3>
              <p>{data.totalCalls}</p>
            </article>
            <article className="list-card">
              <h3>Estimated cost (USD)</h3>
              <p>${data.totalCostUsd.toFixed(4)}</p>
            </article>
            <article className="list-card">
              <h3>Month start</h3>
              <p>{new Date(data.monthStart).toLocaleDateString()}</p>
            </article>
          </div>

          <div className="list-grid">
            {data.providers.map((p) => (
              <article key={p.provider} className="list-card">
                <h3>{p.provider}</h3>
                <p>Calls: {p.calls}</p>
                <p>Success: {p.success} / Fail: {p.fail}</p>
                <p>Success rate: {p.successRate}%</p>
                <p>Estimated: ${p.estimatedCostUsd.toFixed(4)}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
