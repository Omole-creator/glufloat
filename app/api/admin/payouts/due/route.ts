import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/adminFetch";
import { weekStartWAT } from "@/lib/careFees";
import { payableNow } from "@/lib/creators";

export const dynamic = "force-dynamic";

/**
 * Is it time to pay anyone? (founder, 2026-11-16: a blink on the admin menu so
 * a payout is never forgotten.) Read by the admin sidebar.
 *  - payouts: doctors, reps, advisors and dietitians are paid weekly, so it is
 *    time once anything earned BEFORE this week (Monday 00:00 Lagos time) is
 *    still unpaid (or its payout failed).
 *  - creators: paid monthly, and an earning may go once it is 14 days old.
 * Counts only. Any error reads as "nothing due", so the menu never breaks.
 */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const admin = createAdminClient();
  let payouts = 0;
  let creators = 0;
  try {
    const weekStart = weekStartWAT(new Date()).toISOString();
    const [earn, pays] = await Promise.all([
      fetchAll<{ id: string; payout_id: string | null; earned_at: string }>(() =>
        admin.from("clinician_earnings").select("id,payout_id,earned_at").lt("earned_at", weekStart),
      ),
      fetchAll<{ id: string; status: string }>(() => admin.from("earning_payouts").select("id,status").eq("status", "failed")),
    ]);
    const failed = new Set(pays.rows.map((p) => p.id));
    payouts = earn.rows.filter((e) => !e.payout_id || failed.has(e.payout_id)).length;
  } catch {
    /* nothing due */
  }
  try {
    const { data } = await admin.from("creator_earnings").select("earned_at").is("payout_id", null);
    creators = ((data ?? []) as { earned_at: string }[]).filter((e) => payableNow(e.earned_at)).length;
  } catch {
    /* nothing due */
  }
  return NextResponse.json({ payouts, creators });
}
