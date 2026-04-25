"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  prompt: string;
  transcript: string;
  audioUrl: string | null;
  overallBand: number | null;
  status: string;
  createdAt: string;
};

export default function AdminSpeakingSubmissionsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/speaking/submissions", { cache: "no-store" });
    const json = (await res.json()) as { items?: Item[] };
    setItems(json.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function validate(id: string) {
    await fetch(`/api/admin/speaking/submissions/${id}/validate`, { method: "PATCH" });
    await load();
  }

  return (
    <section className="stack-lg">
      <nav className="breadcrumbs">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>
          <Link href="/admin">Admin</Link> /{" "}
        </span>
        <span>
          <Link href="/admin/speaking">Speaking</Link> /{" "}
        </span>
        <span>Submissions</span>
      </nav>

      <div className="section-header">
        <h2>Speaking Submission Review Queue</h2>
        <p>Listen to user audio first, then validate AI pre-generated feedback.</p>
      </div>

      {loading ? (
        <div className="status-banner">
          <strong>Loading...</strong>
        </div>
      ) : items.length === 0 ? (
        <div className="status-banner">
          <strong>No submissions yet.</strong>
        </div>
      ) : (
        <div className="list-grid">
          {items.map((item) => (
            <article key={item.id} className="list-card">
              <h3>{item.prompt}</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
                Submitted: {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>
                Status: <strong>{item.status}</strong> · Overall:{" "}
                <strong>{item.overallBand?.toFixed(1) ?? "N/A"}</strong>
              </p>
              <p>{item.transcript}</p>
              {item.audioUrl ? (
                <audio controls src={item.audioUrl} style={{ width: "100%" }} />
              ) : (
                <p style={{ color: "var(--text-2)" }}>No audio uploaded.</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="sp-ready-btn" href={`/speaking/report/${item.id}`}>
                  Open report page
                </Link>
                {item.status !== "validated" && (
                  <button type="button" className="sp-next-btn" onClick={() => void validate(item.id)}>
                    Validate feedback
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
