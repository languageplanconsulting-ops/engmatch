"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const adminMessages: Record<string, string> = {
  required: "Enter the admin code to open the admin workspace.",
};

export function HomeAdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notice = useMemo(() => {
    const adminState = searchParams.get("admin");
    return adminState ? adminMessages[adminState] ?? null : null;
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const payload = await response.json() as { error?: string; redirectPath?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to sign in as admin.");
      }

      router.push(payload.redirectPath ?? "/admin");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in as admin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#004aad]">Admin access</p>
        <h3 className="mt-2 text-2xl font-bold text-slate-900">Teacher / Admin Login</h3>
        <p className="mt-2 text-sm text-slate-600">
          Use the admin code to manage student access, notifications, and IELTS content.
        </p>
      </div>

      {notice ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Admin code</span>
          <input
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-[#004aad]"
            placeholder="Enter admin code"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Checking code..." : "Open admin workspace"}
        </button>
      </form>
    </div>
  );
}
