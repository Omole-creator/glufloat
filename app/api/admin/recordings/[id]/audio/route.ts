import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { AUDIO_BUCKET, enforceAudioCap, isAdmin } from "@/lib/recordings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const MAX_PART = 4 * 1024 * 1024; // a 30-second voice piece is ~60KB; this is only a guard

/**
 * One 30-second piece of the call's audio, sent by the GluFloat phone while
 * the call goes on. Saving as it goes means a long call, a flat battery or a
 * dropped connection loses at most the last 30 seconds.
 */
export async function POST(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const seq = Number(params.get("seq"));
  const segment = Math.max(0, Math.floor(Number(params.get("segment") ?? 0)) || 0);
  if (!Number.isInteger(seq) || seq < 0) {
    return NextResponse.json({ error: "Bad piece number" }, { status: 400 });
  }
  const mime = (request.headers.get("content-type") ?? "audio/webm").split(";")[0];
  if (!mime.startsWith("audio/")) return NextResponse.json({ error: "Not audio" }, { status: 400 });
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return NextResponse.json({ ok: true });
  if (buf.byteLength > MAX_PART) return NextResponse.json({ error: "Piece too big" }, { status: 413 });

  const admin = createAdminClient();
  const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
  const path = `${id}/${String(seq).padStart(5, "0")}.${ext}`;
  const { error } = await admin.storage
    .from(AUDIO_BUCKET)
    .upload(path, buf, { contentType: mime, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("call_audio_parts").upsert({ session_id: id, seq, segment, path, bytes: buf.byteLength, mime });
  const { data: parts } = await admin.from("call_audio_parts").select("bytes").eq("session_id", id);
  const total = (parts ?? []).reduce((n, p) => n + Number(p.bytes), 0);
  await admin
    .from("call_sessions")
    .update({ audio_bytes: total, audio_deleted_at: null })
    .eq("id", id);
  await enforceAudioCap(id);
  return NextResponse.json({ ok: true });
}
