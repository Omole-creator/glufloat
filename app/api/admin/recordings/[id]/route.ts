import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { AUDIO_BUCKET, deleteAudio, isAdmin } from "@/lib/recordings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** One call: its details, its transcript, and short-lived links to its audio. */
export async function GET(_req: Request, ctx: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await ctx.params;
  const admin = createAdminClient();
  const [{ data: session }, { data: lines }, { data: parts }] = await Promise.all([
    admin.from("call_sessions").select("*").eq("id", id).maybeSingle(),
    admin.from("call_lines").select("*").eq("session_id", id).order("t_ms").order("id"),
    admin.from("call_audio_parts").select("seq,segment,path,bytes,mime").eq("session_id", id).order("seq"),
  ]);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const audio: { seq: number; segment: number; url: string; bytes: number; mime: string }[] = [];
  for (const p of parts ?? []) {
    const { data } = await admin.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(p.path as string, 60 * 60);
    if (data?.signedUrl) {
      audio.push({
        seq: p.seq as number,
        segment: (p.segment as number) ?? 0,
        url: data.signedUrl,
        bytes: p.bytes as number,
        mime: p.mime as string,
      });
    }
  }
  return NextResponse.json({ session, lines: lines ?? [], audio });
}

/**
 * Edit the details (name, purpose) or move the call along
 * (action: "start" | "end"). Starting keeps the FIRST start, so a reconnect in
 * the middle of a call does not reset its clock.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: s } = await admin.from("call_sessions").select("*").eq("id", id).maybeSingle();
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.customer_name !== undefined) {
    const v = clean(body.customer_name, 120);
    if (!v) return NextResponse.json({ error: "The name cannot be empty." }, { status: 400 });
    patch.customer_name = v;
  }
  if (body.purpose !== undefined) {
    const v = clean(body.purpose, 300);
    if (!v) return NextResponse.json({ error: "The purpose cannot be empty." }, { status: 400 });
    patch.purpose = v;
  }
  if (body.action === "start" && s.status !== "ended") {
    patch.status = "live";
    if (!s.started_at) patch.started_at = new Date().toISOString();
  }
  if (body.action === "end" && s.status !== "ended") {
    patch.status = "ended";
    patch.ended_at = new Date().toISOString();
    if (!s.started_at) patch.started_at = patch.ended_at;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ session: s });
  const { data, error } = await admin
    .from("call_sessions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

/**
 * ?what=audio       remove the audio only
 * ?what=transcript  remove every transcript line only
 * ?what=all         remove the whole call (audio, transcript and link)
 */
export async function DELETE(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await ctx.params;
  const what = new URL(request.url).searchParams.get("what") ?? "all";
  const admin = createAdminClient();
  if (what === "audio" || what === "all") await deleteAudio(id);
  if (what === "transcript") await admin.from("call_lines").delete().eq("session_id", id);
  if (what === "all") await admin.from("call_sessions").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
