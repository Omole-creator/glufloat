import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { linkUsable, sessionByToken, turnServers } from "@/lib/recordings";

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
  const usable = linkUsable(s);
  return NextResponse.json({
    customer_name: s.customer_name,
    purpose: s.purpose,
    // An expired link reads as a finished call to the customer.
    status: usable ? s.status : "ended",
    consented: !!s.consent_at,
    // Relay login only for a call that can still happen.
    ice: usable ? turnServers() : [],
  });
}

/** The customer agrees to be recorded. Stamped once, the first time. */
export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const s = await sessionByToken(token);
  if (!s) return NextResponse.json({ error: "This link does not work." }, { status: 404 });
  if (!linkUsable(s)) return NextResponse.json({ error: "This call has ended." }, { status: 410 });
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
