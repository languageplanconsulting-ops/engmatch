import { NextResponse } from "next/server";

type GenerateBody = {
  text: string;
  voice?: string;
};

/**
 * POST /api/speaking/tts/generate
 * Calls Deepgram TTS REST API and returns audio as a base64 data URL.
 * Used by the admin panel when generating TTS for uploaded question packs.
 */
export async function POST(req: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text field is required." }, { status: 400 });
  }

  const voice = body.voice ?? "aura-asteria-en";

  const dgResponse = await fetch(
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: body.text }),
    },
  );

  if (!dgResponse.ok) {
    const errText = await dgResponse.text();
    return NextResponse.json(
      { error: `Deepgram TTS error ${dgResponse.status}: ${errText}` },
      { status: 502 },
    );
  }

  const audioBuffer = await dgResponse.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString("base64");

  return NextResponse.json({
    audioDataUrl: `data:audio/mp3;base64,${base64}`,
  });
}
