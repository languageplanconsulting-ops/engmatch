"use client";

import { useEffect, useMemo, useState } from "react";

const SKILL_KEYS = ["speaking", "reading", "listening", "writing"] as const;
type SkillAccessMap = Record<(typeof SKILL_KEYS)[number], boolean>;

function defaultAccessExpiryDate(from = new Date()) {
  const expiry = new Date(from);
  expiry.setMonth(expiry.getMonth() + 6);
  return expiry;
}

type AccessRecord = {
  id: string;
  email: string;
  expiresAt: string;
  speakingEnabled: boolean;
  readingEnabled: boolean;
  listeningEnabled: boolean;
  writingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type NotificationRecord = {
  id: string;
  email: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function accessRecordToFlags(record: AccessRecord): SkillAccessMap {
  return {
    speaking: record.speakingEnabled,
    reading: record.readingEnabled,
    listening: record.listeningEnabled,
    writing: record.writingEnabled,
  };
}

export function StudentAccessAdmin() {
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(defaultAccessExpiryDate()));
  const [grantSkills, setGrantSkills] = useState<SkillAccessMap>({
    speaking: true,
    reading: true,
    listening: true,
    writing: true,
  });

  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationDescription, setNotificationDescription] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [accessResponse, notificationsResponse] = await Promise.all([
        fetch("/api/admin/student-access"),
        fetch("/api/admin/student-notifications"),
      ]);

      if (!accessResponse.ok || !notificationsResponse.ok) {
        throw new Error("Failed to load admin data.");
      }

      const accessPayload = await accessResponse.json() as { items: AccessRecord[] };
      const notificationsPayload = await notificationsResponse.json() as { items: NotificationRecord[] };

      setRecords(accessPayload.items);
      setNotifications(notificationsPayload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const recordsByEmail = useMemo(() => {
    return new Map(records.map((record) => [record.email, record]));
  }, [records]);

  function toggleGrantSkill(skill: keyof SkillAccessMap) {
    setGrantSkills((current) => ({ ...current, [skill]: !current[skill] }));
  }

  async function handleGrantSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/student-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          expiresAt,
          access: grantSkills,
        }),
      });

      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save access.");
      }

      setMessage("Student access saved and notification sent.");
      setEmail("");
      setExpiresAt(toDateInputValue(defaultAccessExpiryDate()));
      setGrantSkills({
        speaking: true,
        reading: true,
        listening: true,
        writing: true,
      });
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save access.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNotificationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/student-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: notificationEmail,
          title: notificationTitle,
          description: notificationDescription,
          category: "admin",
        }),
      });

      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send notification.");
      }

      setMessage("Notification sent.");
      setNotificationEmail("");
      setNotificationTitle("");
      setNotificationDescription("");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to send notification.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRecord(recordId: string, next: Partial<{ expiresAt: string } & SkillAccessMap>) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/student-access/${recordId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });

      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update student access.");
      }

      setMessage("Student access updated and notification sent.");
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update student access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Grant student access</h3>
        <p className="mt-2 text-sm text-slate-600">
          Default access lasts 6 months. You can adjust the expiry date and decide which IELTS skills are enabled.
        </p>

        <form onSubmit={handleGrantSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Student email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#004aad]"
              placeholder="student@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Expiry date</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#004aad]"
              required
            />
          </label>

          <div className="md:col-span-2">
            <span className="mb-3 block text-sm font-medium text-slate-700">App access</span>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SKILL_KEYS.map((skill) => (
                <label
                  key={skill}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="font-medium capitalize text-slate-800">{skill}</span>
                  <input
                    type="checkbox"
                    checked={grantSkills[skill]}
                    onChange={() => toggleGrantSkill(skill)}
                    className="h-4 w-4 accent-[#004aad]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#004aad] px-5 py-3 font-semibold text-white transition hover:bg-[#003377] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save access
            </button>
            <span className="text-sm text-slate-500">A system notification will be created automatically.</span>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Send manual notification</h3>
        <p className="mt-2 text-sm text-slate-600">
          Use this for reminders, renewal notes, or instructions for specific students.
        </p>

        <form onSubmit={handleNotificationSubmit} className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Student email</span>
            <input
              type="email"
              value={notificationEmail}
              onChange={(event) => setNotificationEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#004aad]"
              placeholder="student@example.com"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Title</span>
            <input
              type="text"
              value={notificationTitle}
              onChange={(event) => setNotificationTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#004aad]"
              placeholder="Your writing access was extended"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Message</span>
            <textarea
              value={notificationDescription}
              onChange={(event) => setNotificationDescription(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#004aad]"
              placeholder="You can now continue practicing in Writing until 2026-10-24."
              required
            />
          </label>
          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send notification
            </button>
          </div>
        </form>
      </section>

      {(message || error) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error ?? message}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Active student access</h3>
            <p className="mt-2 text-sm text-slate-600">Adjust expiry dates and skill access without recreating the student.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Expiry</th>
                <th className="px-3 py-3 font-medium">Skills</th>
                <th className="px-3 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => {
                const flags = accessRecordToFlags(record);

                return (
                  <tr key={record.id} className="align-top">
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-900">{record.email}</div>
                      {recordsByEmail.has(record.email) ? (
                        <div className="mt-1 text-xs text-slate-500">Student record saved</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="date"
                        defaultValue={record.expiresAt.slice(0, 10)}
                        onBlur={(event) => {
                          const nextValue = event.currentTarget.value;
                          if (nextValue && nextValue !== record.expiresAt.slice(0, 10)) {
                            void updateRecord(record.id, { expiresAt: nextValue });
                          }
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#004aad]"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SKILL_KEYS.map((skill) => (
                          <label key={skill} className="flex items-center gap-2 text-slate-700">
                            <input
                              type="checkbox"
                              checked={flags[skill]}
                              onChange={(event) => {
                                void updateRecord(record.id, { [skill]: event.currentTarget.checked });
                              }}
                              className="h-4 w-4 accent-[#004aad]"
                            />
                            <span className="capitalize">{skill}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">{new Date(record.updatedAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && records.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No student access records yet.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Recent notifications</h3>
        <p className="mt-2 text-sm text-slate-600">Latest system and admin notices sent to students.</p>
        <div className="mt-6 space-y-4">
          {notifications.map((notification) => (
            <article key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900">{notification.title}</h4>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{notification.category}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>{notification.email}</div>
                  <div>{new Date(notification.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-700">{notification.description}</p>
            </article>
          ))}
          {!loading && notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
