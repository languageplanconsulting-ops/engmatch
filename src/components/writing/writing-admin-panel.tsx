"use client";

import Link from "next/link";
import { useState } from "react";
import { teacherInbox, writingUploadTemplates } from "@/lib/writing-demo";

type TaskValue = "task-1" | "task-2";

export function WritingAdminPanel() {
  const [task, setTask] = useState<TaskValue>("task-1");
  const [jsonText, setJsonText] = useState(writingUploadTemplates["task-1"]);

  function handleTaskChange(nextTask: TaskValue) {
    setTask(nextTask);
    setJsonText(writingUploadTemplates[nextTask]);
  }

  async function copyTemplate() {
    await navigator.clipboard.writeText(writingUploadTemplates[task]);
    setJsonText(writingUploadTemplates[task]);
  }

  return (
    <section className="stack-md">
      {/* Quick Review entry */}
      <div className="qr-admin-banner">
        <div>
          <p className="qr-admin-banner-label">New tool</p>
          <strong className="qr-admin-banner-title">Quick Review</strong>
          <p className="qr-admin-banner-sub">
            Paste any student essay, annotate inline, score all four IELTS criteria, and export a formatted PDF in one flow — no submission needed.
          </p>
        </div>
        <Link href="/admin/writing/quick" className="qr-admin-banner-btn">
          Open Quick Review →
        </Link>
      </div>

    <section className="writing-admin-grid">
      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Notifications</p>
            <h2>Questions sent in</h2>
          </div>
        </div>
        <div className="teacher-inbox-list">
          {teacherInbox.map((item) => (
            <article className="inbox-card" key={item.id}>
              <div className="inbox-card-top">
                <span>{item.task.toUpperCase()}</span>
                <strong>{item.status}</strong>
              </div>
              <h4>{item.studentName}</h4>
              <p>{item.notification}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="panel-shell">
        <div className="panel-shell-header">
          <div>
            <p className="panel-kicker">Bulk upload question</p>
            <h3>Paste JSON</h3>
          </div>
        </div>
        <div className="simple-upload-grid">
          <label className="field-block">
            <span>Type of question</span>
            <select
              value={task}
              onChange={(event) => handleTaskChange(event.target.value as TaskValue)}
            >
              <option value="task-1">Task 1 writing</option>
              <option value="task-2">Task 2 writing</option>
            </select>
          </label>
          <label className="field-block">
            <span>JSON</span>
            <textarea
              className="annotation-input"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
            />
          </label>
        </div>
        <div className="workspace-actions">
          <button className="action-button" onClick={copyTemplate}>
            Copy template
          </button>
          <button className="action-button action-button-primary">Upload JSON</button>
        </div>
      </article>
    </section>
    </section>
  );
}
