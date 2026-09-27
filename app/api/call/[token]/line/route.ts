import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { msSinceStart, sessionByToken } from "@/lib/recordings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/**
 * One sentence the customer's own phone heard them say. The speaker is ALWAYS
 * "customer" here, whatever the request says, and it is only accepted after
 * they agreed to be recorded and before the call ended.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const s = await sessionByToken(token);
  if (!s) return NextResponse.json({ error: "This link does not work." }, { status: 404 });
  if (!s.consent_at || s.status === "ended") {
    return NextResponse.json({ error: "Not recording." }, { status: 409 });
  }
  const body = await request.json().catch(() => ({}));
  const text = String(body.text ?? "").trim().slice(0, 4000);
  if (!text) return NextResponse.json({ ok: true });
  const { error } = await createAdminClient()
    .from("call_lines")
    .insert({ session_id: s.id, speaker: "customer", text, t_ms: msSinceStart(s) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
