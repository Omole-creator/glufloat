import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { payableNow } from "@/lib/creators";

export const dynamic = "force-dynamic";

/**
 * POST { creatorId, ids }: record that the money for these earnings was sent
 * to the creator. By id, never "everything owed": an earning that turns 14
 * days old between loading the page and pressing the button stays owed and
 * goes in next month's payout, instead of being marked paid with no money sent.
 * Only unpaid earnings at least 14 days old count.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { creatorId?: unknown; ids?: unknown };
  const creatorId = String(body.creatorId ?? "");
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 2000) : [];
  if (!creatorId || ids.length === 0) return NextResponse.json({ error: "Nothing to pay." }, { status: 400 });
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("creator_earnings")
    .select("id,amount,earned_at,payout_id,creator_id")
    .in("id", ids)
    .eq("creator_id", creatorId)
    .is("payout_id", null);
  if (error) return NextResponse.json({ error: "This did not work. Please try again." }, { status: 503 });
  const due = (rows ?? []).filter((r) => payableNow(r.earned_at as string));
  const total = due.reduce((n, r) => n + Number(r.amount), 0);
  if (total <= 0) return NextResponse.json({ error: "This was already marked as paid." }, { status: 409 });

  const { data: payout, error: pErr } = await admin
    .from("creator_payouts")
    .insert({ creator_id: creatorId, amount: total, reference: `creator-${randomBytes(8).toString("hex")}` })
    .select("id")
    .single();
  if (pErr || !payout) return NextResponse.json({ error: "This did not save. Please try again." }, { status: 503 });
  // Only rows still unpaid: a second press at the same moment cannot stamp them twice.
  const { data: stamped } = await admin
    .from("creator_earnings")
    .update({ payout_id: payout.id })
    .in(
      "id",
      due.map((r) => r.id as string),
    )
    .is("payout_id", null)
    .select("amount");
  const stampedTotal = (stamped ?? []).reduce((n, r) => n + Number(r.amount), 0);
  if (stampedTotal !== total) {
    if (stampedTotal <= 0) {
      await admin.from("creator_payouts").delete().eq("id", payout.id);
      return NextResponse.json({ error: "This was already marked as paid." }, { status: 409 });
    }
    await admin.from("creator_payouts").update({ amount: stampedTotal }).eq("id", payout.id);
  }
  return NextResponse.json({ ok: true, amount: stampedTotal });
}
