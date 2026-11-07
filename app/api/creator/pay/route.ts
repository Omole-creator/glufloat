import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { startCreatorPayment } from "@/lib/creatorsServer";
import { TIERS, type Tier } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * POST { tier }: start a monthly payment at 20% off, for someone on a
 * creator's code who has made fewer than 3 payments. The price comes from
 * the server, never the browser. Answers { url } (Paystack's checkout).
 * The payment comes back through /unlock and /api/paystack/claim exactly like
 * any other plan payment; lib/pricing.ts reads the tier from the amount.
 */
export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { tier?: unknown };
  const tier = TIERS.includes(body.tier as Tier) ? (body.tier as Tier) : null;
  if (!tier) return NextResponse.json({ error: "Please choose a plan." }, { status: 400 });
  const r = await startCreatorPayment(createAdminClient(), user.id, user.email, tier);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ url: r.url });
}
