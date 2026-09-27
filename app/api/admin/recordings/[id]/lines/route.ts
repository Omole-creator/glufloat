import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin, msSinceStart } from "@/lib/recordings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const SPEAKERS = new Set(["glufloat", "customer"]);

/**
 * Add a line. During a call this is the GluFloat phone saving what it heard
 * (no t_ms sent, so the server stamps it on the call's own clock). Afterwards
 * it is somebody adding a missed line by hand.
 */
export async function POST(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const text = String(body.text ?? "").trim().slice(0, 4000);
  const speaker = String(body.speaker ?? "glufloat");
  if (!text || !SPEAKERS.has(speaker)) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: s } = await admin
    .from("call_sessions")
    .select("started_at")
    .eq("id", id)
    .maybeSingle();
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t_ms = Number.isFinite(body.t_ms) ? Math.max(0, Math.round(body.t_ms)) : msSinceStart(s);
  const { data, error } = await admin
    .from("call_lines")
    .insert({ session_id: id, speaker, text, t_ms, edited: body.manual === true })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ line: data });
}

/** Edit one line's words, or who said it. */
export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { edited: true };
  if (body.text !== undefined) {
    const t = String(body.text).trim().slice(0, 4000);
    if (!t) {
      return NextResponse.json({ error: "A line cannot be empty. Delete it instead." }, { status: 400 });
    }
    patch.text = t;
  }
  if (body.speaker !== undefined) {
    if (!SPEAKERS.has(body.speaker)) return NextResponse.json({ error: "Unknown speaker." }, { status: 400 });
    patch.speaker = body.speaker;
  }
  const { data, error } = await createAdminClient()
    .from("call_lines")
    .update(patch)
    .eq("id", Number(body.lineId))
    .eq("session_id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ line: data });
}

/** Delete one line. */
export async function DELETE(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await ctx.params;
  const lineId = Number(new URL(request.url).searchParams.get("lineId"));
  await createAdminClient().from("call_lines").delete().eq("id", lineId).eq("session_id", id);
  return NextResponse.json({ ok: true });
}
