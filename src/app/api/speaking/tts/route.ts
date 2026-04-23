import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.DEEPGRAM_API_KEY),
    reason: process.env.DEEPGRAM_API_KEY
      ? "Deepgram credentials detected for TTS."
      : "Deepgram TTS is not configured, so browser voice fallback is being used.",
  });
}
