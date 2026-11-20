/**
 * Turn ONE successful Paystack payment into access, exactly once.
 *
 * Shared by /api/paystack/claim and /api/paystack/webhook, which both see the
 * same payment (often seconds apart, sometimes at the same instant).
 *
 * Two things changed here on 2026-10-11, both for the same reason:
 *
 *  1. Paid days now ADD UP. Every payment used to set the end date to "now +
 *     30 days", so somebody who renewed with 10 days left lost those 10, and
 *     any bonus days (lib/referral.ts) vanished at the next renewal. The new
 *     end is "the later of now and the current end", plus the days bought.
 *
 *  2. Because of (1), granting must happen once per payment, not once per
 *     route. The payments row is the lock: it is inserted with
 *     ignoreDuplicates, and Postgres lets exactly one insert through. Whoever
 *     inserts (or whoever first attaches a user to a row the webhook could not
 *     match) grants. Everybody else is told "already".
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { periodMsForAmount, tierForAmount } from "@/lib/pricing";
import { upsertSubscription } from "@/lib/subscriptionWrite";
import { rewardInviter } from "@/lib/referral";
import { earnCareFees } from "@/lib/careFeesServer";
import { earnCreatorFee } from "@/lib/creatorsServer";
import { TRIAL_DAYS } from "@/lib/trial";

export type GrantResult = "granted" | "already" | "conflict" | "no_user";

const DAY_MS = 24 * 60 * 60 * 1000;
const WAT_MS = 60 * 60 * 1000; // Nigeria, GMT+1, no daylight saving

/**
 * When a free trial ends: midnight (Nigerian time) at the start of day
 * TRIAL_DAYS + 1, counted from the start day. Matches getAccess(), which
 * counts calendar days and calls the trial over on day 8. 0 if no trial.
 */
export function trialEndMs(trialStart: string | null | undefined): number {
  if (!trialStart) return 0;
  const start = new Date(trialStart).getTime();
  if (!Number.isFinite(start)) return 0;
  const startDay = Math.floor((start + WAT_MS) / DAY_MS) * DAY_MS - WAT_MS;
  return startDay + TRIAL_DAYS * DAY_MS;
}

export async function grantPayment(
  admin: SupabaseClient,
  p: {
    uid: string | null;
    reference: string;
    amount: number;
    email: string;
    paidAt: string;
    customerCode: string | null;
  },
): Promise<GrantResult> {
  const row = {
    user_id: p.uid,
    email: p.email,
    reference: p.reference,
    amount: p.amount,
    status: "success",
    paid_at: p.paidAt,
  };
  const { data: inserted, error: insertError } = await admin
    .from("payments")
    .upsert(row, { onConflict: "reference", ignoreDuplicates: true })
    .select("reference");

  if (insertError) {
    // Something other than a duplicate went wrong. Never let that cost a buyer
    // their access: save it the old way and grant.
    await admin.from("payments").upsert(row, { onConflict: "reference" });
    if (!p.uid) return "no_user";
  } else if (!inserted || inserted.length === 0) {
    const { data: existing } = await admin
      .from("payments")
      .select("user_id")
      .eq("reference", p.reference)
      .maybeSingle();
    if (existing?.user_id) {
      if (p.uid && existing.user_id !== p.uid) return "conflict";
      return "already";
    }
    if (!p.uid) return "no_user";
    // The webhook saved it but could not tell whose it was. Attach it, and only
    // the one call that actually attached it goes on to grant.
    const { data: attached } = await admin
      .from("payments")
      .update({ user_id: p.uid })
      .eq("reference", p.reference)
      .is("user_id", null)
      .select("reference");
    if (!attached || attached.length === 0) return "already";
  } else if (!p.uid) {
    return "no_user";
  }

  const uid = p.uid as string;
  const now = Date.now();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", uid)
    .maybeSingle();
  const end = sub?.current_period_end ? new Date(sub.current_period_end as string).getTime() : 0;
  const live = !!sub && (sub.status === "active" || sub.status === "non-renewing") && end > now;
  // Paying during the free week keeps the free days (founder, 2026-11-20):
  // the paid time starts when the trial would have ended, never today.
  let from = live ? end : now;
  if (!live) {
    const { data: prof } = await admin.from("profiles").select("trial_start").eq("id", uid).maybeSingle();
    const trialEnd = trialEndMs(prof?.trial_start as string | null | undefined);
    if (trialEnd > from) from = trialEnd;
  }

  await upsertSubscription(admin, {
    user_id: uid,
    status: "active",
    current_period_end: new Date(from + periodMsForAmount(p.amount)).toISOString(),
    amount: p.amount,
    tier: tierForAmount(p.amount),
    paystack_customer_code: p.customerCode,
    updated_at: new Date().toISOString(),
  });

  await rewardInviter(admin, uid, p.reference);
  // A patient of a Glufloat doctor: the doctor's care fee, and the field agent
  // and advisor who brought that doctor (lib/careFeesServer.ts). Here, after
  // the lock above, so it runs once per payment. It never throws.
  await earnCareFees(admin, { uid, reference: p.reference, amount: p.amount, paidAt: p.paidAt });
  // A person a creator brought: the creator's share (lib/creatorsServer.ts).
  await earnCreatorFee(admin, { uid, reference: p.reference, amount: p.amount, paidAt: p.paidAt });
  return "granted";
}
