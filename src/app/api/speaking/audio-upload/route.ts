import { NextResponse } from "next/server";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const DEFAULT_BUCKET = "speaking-audio";

function sanitizeSegment(v: string) {
  return v.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "x";
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SPEAKING_AUDIO_BUCKET || DEFAULT_BUCKET;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase storage env is not configured." }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const attemptId = sanitizeSegment(String(formData.get("attemptId") ?? "attempt"));
  const questionId = sanitizeSegment(String(formData.get("questionId") ?? "question"));
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "invalid file size" }, { status: 400 });
  }
  if (!file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "file must be audio/*" }, { status: 400 });
  }

  const ext = file.type.includes("mpeg") ? "mp3" : file.type.includes("webm") ? "webm" : "wav";
  const path = `${attemptId}/${questionId}/${Date.now()}.${ext}`;

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: await file.arrayBuffer(),
    },
  );
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    return NextResponse.json({ error: "upload failed", detail: errorText }, { status: 502 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  return NextResponse.json({ path, audioUrl: publicUrl });
}
