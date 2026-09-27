import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionByToken } from "@/lib/recordings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/**
 * What the customer's page needs and nothing more: who the call is for, why,
 * and whether it is still open. Never the transcript.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const s = await sessionByToken(token);
  if (!s) return NextResponse.json({ error: "This link does not work." }, { status: 404 });
  return NextResponse.json({
    customer_name: s.customer_name,
    purpose: s.purpose,
    status: s.status,
    consented: !!s.consent_at,
  });
}

/** The customer agrees to be recorded. Stamped once, the first time. */
export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const s = await sessionByToken(token);
  if (!s) return NextResponse.json({ error: "This link does not work." }, { status: 404 });
  if (s.status === "ended") return NextResponse.json({ error: "This call has ended." }, { status: 410 });
  const body = await request.json().catch(() => ({}));
  if (body.action !== "consent") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (!s.consent_at) {
    await createAdminClient()
      .from("call_sessions")
      .update({ consent_at: new Date().toISOString() })
      .eq("id", s.id);
  }
  return NextResponse.json({ ok: true });
}
