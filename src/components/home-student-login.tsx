"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const loginMessages: Record<string, string> = {
  required: "Enter your email to continue into your student workspace.",
  missing: "This email does not have active access yet. Please ask your admin to grant access.",
  expired: "Your access has expired. Please ask your admin to extend your access date.",
  restricted: "Your account is active, but this section is not enabled for your email yet.",
  invalid_email: "Enter a valid email address.",
};

export function HomeStudentLogin({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notice = useMemo(() => {
    const loginState = searchParams.get("login");
    return loginState ? loginMessages[loginState] ?? null : null;
  }, [searchParams]);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/student-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json() as { error?: string; redirectPath?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to sign in.");
      }

      router.push(payload.redirectPath ?? "/speaking");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {notice ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <form onSubmit={submitLogin} className={compact ? "flex items-center gap-3" : "flex flex-col gap-3"}>
        <label className={`relative block ${compact ? "min-w-0 flex-1" : ""}`}>
          <span className="sr-only">Student email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Student Email / อีเมลนักเรียน"
            className="block w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm leading-5 text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#004aad] focus:ring-2 focus:ring-[#004aad]/15"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className={compact
            ? "inline-flex items-center rounded-md bg-[#004aad] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003377] disabled:cursor-not-allowed disabled:opacity-60"
            : "w-full rounded-md bg-[#ffcc00] px-6 py-3 font-bold text-[#004aad] shadow-md transition hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:opacity-60"}
        >
          {submitting ? "Checking access..." : compact ? "Log in" : "Log In to Workspace"}
        </button>
      </form>
      <p className={`text-slate-500 ${compact ? "text-xs" : "text-sm text-white/80"}`}>
        Access is granted by admin using your email address. Default access is usually 6 months.
      </p>
    </div>
  );
}
