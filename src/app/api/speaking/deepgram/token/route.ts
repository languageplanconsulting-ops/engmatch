import { NextResponse } from "next/server";

/**
 * GET /api/speaking/deepgram/token
 * Returns availability status and a temporary token for Deepgram WebSocket transcription.
 * The token is the API key itself (acceptable for preview/demo environments).
 */
export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  return NextResponse.json({
    available: Boolean(apiKey),
    token: apiKey ?? null,
    reason: apiKey
      ? "Deepgram credentials detected — live transcription is active."
      : "DEEPGRAM_API_KEY is not set. Web Speech API fallback will be used.",
  });
}
