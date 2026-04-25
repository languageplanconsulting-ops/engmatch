import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function estimateByProvider(provider: string, calls: number) {
  // Approximate per-call estimate in USD for business dashboard.
  const perCall =
    provider === "gemini" ? 0.004
      : provider === "claude-haiku" ? 0.003
      : provider === "gpt-5.4-mini" ? 0.005
      : 0.004;
  return Number((calls * perCall).toFixed(4));
}

export async function GET() {
  const start = monthStart();
  const events = await prisma.aiUsageEvent.findMany({
    where: { createdAt: { gte: start }, feature: "speaking-assessment" },
    orderBy: { createdAt: "desc" },
  });

  const byProvider = new Map<string, { calls: number; success: number; fail: number }>();
  for (const event of events) {
    const row = byProvider.get(event.provider) ?? { calls: 0, success: 0, fail: 0 };
    row.calls += 1;
    if (event.success) row.success += 1;
    else row.fail += 1;
    byProvider.set(event.provider, row);
  }

  const providers = Array.from(byProvider.entries()).map(([provider, v]) => ({
    provider,
    calls: v.calls,
    success: v.success,
    fail: v.fail,
    successRate: v.calls ? Number(((v.success / v.calls) * 100).toFixed(1)) : 0,
    estimatedCostUsd: estimateByProvider(provider, v.calls),
  }));

  const totalCalls = providers.reduce((sum, p) => sum + p.calls, 0);
  const totalCostUsd = Number(providers.reduce((sum, p) => sum + p.estimatedCostUsd, 0).toFixed(4));

  return NextResponse.json({
    monthStart: start.toISOString(),
    totalCalls,
    totalCostUsd,
    providers,
  });
}
