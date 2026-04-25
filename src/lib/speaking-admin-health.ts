import { prisma } from "@/lib/prisma";

export type SpeakingHealthCheck = {
  id: string;
  label: string;
  ok: boolean;
  optional?: boolean;
  ms?: number;
  detail?: string;
  fullAi?: boolean;
};

export type SpeakingHealthResult = {
  at: string;
  checks: SpeakingHealthCheck[];
  allCriticalOk: boolean;
};

function isFullAiReport(body: Record<string, unknown>): boolean {
  return body.errorCode !== "fallback";
}

/** Server-only: Gemini assess, env flags, Prisma packs (no microphone). */
export async function runSpeakingSystemHealth(): Promise<SpeakingHealthResult> {
  const checks: SpeakingHealthCheck[] = [];

  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim());
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.CHATGPT_API_KEY?.trim());
  const hasAnyProvider = hasGemini || hasAnthropic || hasOpenAI;

  checks.push({
    id: "gemini_api_key",
    label: "GEMINI_API_KEY",
    ok: hasGemini,
    optional: true,
    detail: hasGemini ? "Present on server." : "Missing Gemini key.",
  });
  checks.push({
    id: "anthropic_api_key",
    label: "ANTHROPIC_API_KEY / CLAUDE_API_KEY",
    ok: hasAnthropic,
    optional: true,
    detail: hasAnthropic ? "Present on server." : "Missing Anthropic key.",
  });
  checks.push({
    id: "openai_api_key",
    label: "OPENAI_API_KEY / CHATGPT_API_KEY",
    ok: hasOpenAI,
    optional: true,
    detail: hasOpenAI ? "Present on server." : "Missing OpenAI key.",
  });
  checks.push({
    id: "ai_provider_config",
    label: "At least one speaking AI provider",
    ok: hasAnyProvider,
    detail: hasAnyProvider
      ? "At least one provider key is configured."
      : "No provider key is configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.",
  });

  if (hasAnyProvider) {
    const start = Date.now();
    try {
      const { POST: assessSpeaking } = await import("@/app/api/speaking/assess/route");
      const req = new Request("https://internal/api/speaking/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Describe a person who gave you very useful advice.",
          transcript:
            "One of the best advice I ever received was from my older cousin, when I was feeling very confused about my future. At that time, I was studying very hard, but I still felt like I was not good enough, and I always compared myself with other people around me. Some of my friends got better grades, some people seemed more confident than me, and some already knew what they wanted to do in life. Because of this, I felt stress, worried, and sometimes I did not want to try anymore. My cousin noticed that I was not happy, so he talked to me one evening. He said, You do not need to run the same race as everyone else, you only need to improve yourself step by step. This sentence sound simple, but it really helped me a lot. He explained that everyone has different background, different problems, and different speed in life, so it is not fair to compare my beginning with another person success. He also told me that making small progress every day is better than waiting to become perfect before I start. After listening to him, I started to change my thinking. I tried to focus on my own improvement, such as studying a little better, sleeping earlier, and being more brave to ask questions in class. I still made many mistakes, and sometimes I still feel nervous, but I dont blame myself too much like before. This advice taught me that life is not about being the best person all the time, but about becoming better than who I was yesterday. I think it was a very useful advice, because it made me more calm, more patient, and more confident with my own journey.",
          mode: "part-3",
        }),
      });
      const res = await assessSpeaking(req);
      const ms = Date.now() - start;
      const json = (await res.json()) as Record<string, unknown>;
      const err = typeof json.error === "string" ? json.error : null;
      const hasShape =
        json.overall &&
        typeof json.overall === "object" &&
        Number.isFinite(Number((json.overall as Record<string, unknown>).roundedBand ?? NaN)) &&
        json.criteria &&
        typeof json.criteria === "object";

      const fullAi = hasShape && !err && isFullAiReport(json);
      const provider = typeof json.feedbackSource === "string" ? json.feedbackSource : "unknown provider";
      const model = typeof json.feedbackModel === "string" ? json.feedbackModel : "unknown model";
      const fallbackReason = typeof json.fallbackReason === "string" ? json.fallbackReason : null;

      checks.push({
        id: "speaking_assess",
        label: "Speaking assess (/api/speaking/assess)",
        ok: Boolean(res.ok && hasShape),
        ms,
        fullAi: Boolean(fullAi),
        detail: err
          ? err
          : fullAi
            ? `HTTP ${res.status} — full AI report from ${provider} (${model}).`
            : `HTTP ${res.status} — fallback estimate returned.${fallbackReason ? ` ${fallbackReason}` : ""}`,
      });
    } catch (e) {
      checks.push({
        id: "speaking_assess",
        label: "Speaking assess API",
        ok: false,
        detail: e instanceof Error ? e.message : "Unknown error",
      });
    }
  } else {
    checks.push({
      id: "speaking_assess",
      label: "Speaking assess API",
      ok: false,
      detail: "Skipped — no speaking AI provider key is configured.",
    });
  }

  const hasDeepgram = Boolean(process.env.DEEPGRAM_API_KEY?.trim());
  checks.push({
    id: "deepgram_api_key",
    label: "DEEPGRAM_API_KEY (live STT)",
    ok: hasDeepgram,
    optional: true,
    detail: hasDeepgram
      ? "Present — Deepgram live transcription can be used."
      : "Not set — browser Web Speech fallback only.",
  });

  try {
    const start = Date.now();
    await prisma.speakingPack.findMany({ take: 1 });
    checks.push({
      id: "speaking_packs_db",
      label: "Speaking packs (DATABASE_URL)",
      ok: true,
      ms: Date.now() - start,
      detail: "Database reachable.",
    });
  } catch (e) {
    checks.push({
      id: "speaking_packs_db",
      label: "Speaking packs (DATABASE_URL)",
      ok: false,
      detail: e instanceof Error ? e.message : "Database error",
    });
  }

  const critical = checks.filter((c) => !c.optional);
  const allCriticalOk = critical.every((c) => c.ok);

  return {
    at: new Date().toISOString(),
    checks,
    allCriticalOk,
  };
}
