import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Mark a partner as paid.
 *
 * Ticking "paid" does two things that must agree with each other: it writes a
 * payout record for the money that left your hand, and it stamps exactly the
 * commissions that payment covered.
 *
 * The order matters. We read the pending commissions FIRST and pay only those
 * ids. If we instead said "mark everything pending as paid", a commission earned
 * in the seconds between reading the total and writing the update would be marked
 * paid without the money ever being sent, and the partner would silently lose
 * N600. Paying by id makes that impossible: anything that arrives mid-way stays
 * pending and turns up in the next payout run.
 */
export async function POST(request: Request) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const { partner_id, note } = await request.json().catch(() => ({}));
  if (!partner_id) {
    return NextResponse.json({ error: "No partner given." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: pending, error } = await admin
    .from("commissions")
    .select("id,amount")
    .eq("partner_id", partner_id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending?.length) {
    return NextResponse.json({ error: "Nothing is owed to this partner." }, { status: 400 });
  }

  const ids = pending.map((p) => p.id);
  const amount = pending.reduce((n, p) => n + p.amount, 0);

  const { data: payout, error: e2 } = await admin
    .from("payouts")
    .insert({
      partner_id,
      amount,
      count: ids.length,
      note: (note ?? "").toString().trim() || null,
    })
    .select()
    .single();

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const { error: e3 } = await admin
    .from("commissions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payout_id: payout.id,
    })
    .in("id", ids);

  if (e3) {
    // The payout row is written but the commissions are not stamped. Undo it,
    // rather than leave a payout that looks settled and commissions that will be
    // paid a second time next week.
    await admin.from("payouts").delete().eq("id", payout.id);
    return NextResponse.json({ error: e3.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, amount, count: ids.length });
}
