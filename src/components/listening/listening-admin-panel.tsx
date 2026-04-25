"use client";

import { useEffect, useState } from "react";

type ListeningSet = {
  id: string;
  title: string;
  level: string;
  description?: string;
  transcript?: string;
  audioUrl?: string;
  questions?: string[];
};

const listeningTemplate = JSON.stringify(
  {
    id: "ls-301",
    title: "Campus accommodation enquiry",
    level: "Band 6.0-6.5",
    description: "Student practices a short enquiry conversation with note-completion focus.",
    transcript: "Receptionist: Good morning. Student: I'd like to ask about campus housing...",
    questions: [
      "What type of room is available?",
      "How much is the weekly rent?",
      "When can the student move in?",
    ],
  },
  null,
  2,
);

export function ListeningAdminPanel() {
  const [jsonText, setJsonText] = useState(listeningTemplate);
  const [items, setItems] = useState<ListeningSet[]>([]);
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function loadItems() {
    const response = await fetch("/api/admin/listening/sets", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { items?: ListeningSet[] };
    setItems(payload.items ?? []);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleUpload() {
    setState("idle");
    setMessage("");

    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const sets = Array.isArray(parsed) ? parsed : [parsed];

      const response = await fetch("/api/admin/listening/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets }),
      });

      const payload = (await response.json()) as { error?: string; items?: ListeningSet[]; savedCount?: number };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to upload listening sets.");
      }

      setItems(payload.items ?? []);
      setState("ok");
      setMessage(`${payload.savedCount ?? 0} listening set(s) saved to Supabase.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Failed to upload listening sets.");
    }
  }

  async function removeSet(id: string) {
    const response = await fetch(`/api/admin/listening/sets?setId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) return;
    await loadItems();
  }

  return (
    <section className="stack-md">
      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Listening upload</p>
            <h2>Save listening sets to Supabase</h2>
          </div>
        </div>
        <label className="field-block">
          <span>Listening JSON</span>
          <textarea className="annotation-input" value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
        </label>
        <div className="workspace-actions">
          <button className="action-button" onClick={() => setJsonText(listeningTemplate)}>
            Reset template
          </button>
          <button className="action-button action-button-primary" onClick={handleUpload}>
            Upload JSON
          </button>
        </div>
        {message ? <p className={state === "error" ? "meta" : "panel-kicker"}>{message}</p> : null}
      </article>

      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Saved remotely</p>
            <h3>Listening bank</h3>
          </div>
        </div>
        <div className="teacher-inbox-list">
          {items.map((item) => (
            <article className="inbox-card" key={item.id}>
              <div className="inbox-card-top">
                <span>{item.id}</span>
                <strong>{item.level}</strong>
              </div>
              <h4>{item.title}</h4>
              <p>{item.description ?? "No description provided."}</p>
              <div className="workspace-actions">
                <button className="action-button" onClick={() => removeSet(item.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 ? <p>No remote listening sets yet.</p> : null}
        </div>
      </article>
    </section>
  );
}
