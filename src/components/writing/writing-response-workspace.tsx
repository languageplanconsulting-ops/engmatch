"use client";

import { useState } from "react";
import type { WritingPrompt } from "@/lib/writing-demo";

type Props = {
  prompt: WritingPrompt;
};

export function WritingResponseWorkspace({ prompt }: Props) {
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="stack-lg">
      <article className="panel-shell">
        <label className="writing-label" htmlFor="student-response">
          Writing
        </label>
        <textarea
          className="writing-textarea"
          id="student-response"
          placeholder={`Write your answer for ${prompt.title} here...`}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
        />
        <div className="workspace-actions">
          <button className="action-button action-button-primary" onClick={() => setSubmitted(true)}>
            Submit
          </button>
        </div>
        {submitted ? (
          <div className="status-banner">
            <strong>Submission sent.</strong>
            <p>The teacher panel has been notified.</p>
          </div>
        ) : null}
      </article>
    </section>
  );
}
