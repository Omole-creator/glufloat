/**
 * Creator partners, server side (rules: lib/creators.ts). Server only.
 *
 * Every call fails quietly before supabase/creator-partners-schema.sql (#41)
 * runs, and nothing here may ever cost a buyer their access.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isInternalEmail } from "@/lib/internalAccounts";
import { paystackFee } from "@/lib/finance";
import type { Tier } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";
import {
  TIER_CREATOR_AMOUNTS,
  creatorPrice,
  creatorRate,
  creatorShare,
  creatorWindowOpen,
  CREATOR_DISCOUNT_PAYMENTS,
  normalizeCode,
  validCode,
} from "@/lib/creators";

/** The httpOnly cookie a creator's link sets: the creator's id. */
export const CREATOR_COOKIE = "gf_crt";
/** A readable copy of the CODE only, so sign-up can say "Code FAITH added". Display only, never trusted. */
export const CREATOR_CODE_COOKIE = "gf_crt_code";
export const CREATOR_COOKIE_DAYS = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Creator = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  dash_token: string;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  account_name: string | null;
  status: "active" | "off";
  created_at: string;
};

export async function creatorsReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("creators").select("id", { head: true, count: "exact" }).limit(1);
  return !error;
}

/** The switched-on creator with this code (any case), or null. */
export async function creatorForCode(admin: SupabaseClient, raw: string): Promise<Creator | null> {
  const code = normalizeCode(raw);
  if (!validCode(code)) return null;
  try {
    const { data, error } = await admin.from("creators").select("*").eq("code", code).maybeSingle();
    if (error || !data || data.status !== "active") return null;
    return data as Creator;
  } catch {
    return null;
  }
}

export type AttachResult = "attached" | "already" | "other_creator" | "paid" | "rep" | "no_creator" | "not_ready";

/**
 * Tie this account to a creator. First touch wins (the primary key), and
 * never for one of our own accounts, somebody who has already paid, or a
 * person a rep's patient link brought (one person, one partner).
 * Re-tying to the same creator answers "already".
 */
export async function attachCreator(
  admin: SupabaseClient,
  userId: string,
  creatorId: string,
  via: "link" | "code",
): Promise<AttachResult> {
  try {
    if (!UUID.test(creatorId)) return "no_creator";
    const { data: existing, error: readErr } = await admin.from("creator_users").select("creator_id").eq("user_id", userId).maybeSingle();
    if (readErr) return "not_ready";
    if (existing) return existing.creator_id === creatorId ? "already" : "other_creator";

    const { data: prof } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
    if (isInternalEmail((prof?.email as string | null) ?? "")) return "no_creator";
    const { count } = await admin.from("payments").select("reference", { count: "exact", head: true }).eq("user_id", userId);
    if ((count ?? 0) > 0) return "paid";
    const { data: rep } = await admin.from("rep_patients").select("user_id").eq("user_id", userId).maybeSingle();
    if (rep) return "rep";
    const { data: c } = await admin.from("creators").select("id,status").eq("id", creatorId).maybeSingle();
    if (!c || c.status !== "active") return "no_creator";

    const { error } = await admin.from("creator_users").insert({ user_id: userId, creator_id: creatorId, via });
    if (error) return /duplicate|unique/i.test(error.message) ? "other_creator" : "not_ready";
    return "attached";
  } catch {
    return "not_ready";
  }
}

/** The creator this person came through, and when, or null. */
export async function creatorLinkFor(admin: SupabaseClient, userId: string): Promise<{ creatorId: string; attachedAt: string } | null> {
  try {
    const { data, error } = await admin.from("creator_users").select("creator_id,attached_at").eq("user_id", userId).maybeSingle();
    if (error || !data) return null;
    return { creatorId: data.creator_id as string, attachedAt: data.attached_at as string };
  } catch {
    return null;
  }
}

export type CreatorStatus = {
  /** The code they are using, or null. */
  code: string | null;
  /** Whether they can still add a code (never paid, not already tied, not a rep's patient). */
  canAdd: boolean;
  /** Payments made so far, and how many discounted ones are left. */
  paymentsSoFar: number;
  discountLeft: number;
  /** The discounted monthly prices, kobo, when a discount applies. */
  prices: Record<Tier, number> | null;
};

/** What /app needs: is this person on a code, and do they still get 20% off? */
export async function creatorStatusFor(admin: SupabaseClient, userId: string): Promise<CreatorStatus | null> {
  try {
    if (!(await creatorsReady(admin))) return null;
    const [link, pays, rep] = await Promise.all([
      creatorLinkFor(admin, userId),
      admin.from("payments").select("reference", { count: "exact", head: true }).eq("user_id", userId).eq("status", "success"),
      admin.from("rep_patients").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);
    const paymentsSoFar = pays.count ?? 0;
    let code: string | null = null;
    if (link) {
      const { data } = await admin.from("creators").select("code").eq("id", link.creatorId).maybeSingle();
      code = (data?.code as string | undefined) ?? null;
    }
    const discount = !!code && creatorPrice("basic", paymentsSoFar) !== null;
    return {
      code,
      canAdd: !link && paymentsSoFar === 0 && !rep.data,
      paymentsSoFar,
      discountLeft: code ? Math.max(0, CREATOR_DISCOUNT_PAYMENTS - paymentsSoFar) : 0,
      prices: discount ? { ...TIER_CREATOR_AMOUNTS } : null,
    };
  } catch {
    return null;
  }
}

/**
 * Start a discounted monthly payment (Paystack Transaction Initialize), for
 * exactly the creator price. The server decides the amount and checks the
 * person is still owed the discount; the browser only says which plan.
 */
export async function startCreatorPayment(
  admin: SupabaseClient,
  userId: string,
  email: string | null,
  tier: Tier,
): Promise<{ url: string } | { error: string; status: number }> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { error: "Payments are not set up yet.", status: 500 };
  if (!email) return { error: "Please log in again.", status: 401 };
  const s = await creatorStatusFor(admin, userId);
  if (!s?.prices) return { error: "Your 20% off has been used. Please choose a plan below.", status: 409 };
  const amount = s.prices[tier];
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount,
      currency: "NGN",
      callback_url: `${SITE_URL}/unlock`,
      channels: ["card", "bank", "ussd", "bank_transfer"],
      metadata: { kind: "creator_discount", user_id: userId, tier, code: s.code },
    }),
  });
  const j = await res.json().catch(() => null);
  const url = j?.data?.authorization_url;
  if (!res.ok || typeof url !== "string") return { error: "We could not start the payment. Please try again.", status: 502 };
  return { url };
}

/**
 * The creator's share of one payment. Called from lib/paymentGrant.ts after
 * the payment lock, so once per payment; the unique reference makes a re-run
 * harmless. Never throws.
 */
export async function earnCreatorFee(
  admin: SupabaseClient,
  p: { uid: string; reference: string; amount: number; paidAt: string },
): Promise<boolean> {
  try {
    const link = await creatorLinkFor(admin, p.uid);
    if (!link) return false;
    const { data: c } = await admin.from("creators").select("id,status").eq("id", link.creatorId).maybeSingle();
    // A switched-off creator still earns on people they already brought,
    // unless the founder deletes them (the terms: they keep earning on existing users).
    if (!c) return true;

    const paidAt = new Date(p.paidAt || Date.now());
    // The 12 months start at the person's first payment. This payment is
    // already in payments, so a first payment finds itself.
    const { data: first } = await admin
      .from("payments")
      .select("paid_at")
      .eq("user_id", p.uid)
      .eq("status", "success")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: true })
      .limit(1);
    const firstPaidAt = first && first.length ? new Date(first[0].paid_at as string) : null;
    if (!creatorWindowOpen(firstPaidAt, paidAt)) return true;

    // How many of their OTHER people had paid before this payment.
    const { data: earlier } = await admin
      .from("creator_earnings")
      .select("user_id")
      .eq("creator_id", link.creatorId)
      .lt("earned_at", paidAt.toISOString());
    const payers = new Set((earlier ?? []).map((r) => r.user_id as string).filter((u) => u && u !== p.uid));
    const rate = creatorRate(payers.size);
    const fee = paystackFee(p.amount);
    const amount = creatorShare(p.amount, fee, rate);
    if (amount <= 0) return true;
    await admin.from("creator_earnings").upsert(
      {
        reference: p.reference,
        creator_id: link.creatorId,
        user_id: p.uid,
        payment_amount: p.amount,
        paystack_fee: fee,
        rate,
        amount,
        earned_at: paidAt.toISOString(),
      },
      { onConflict: "reference", ignoreDuplicates: true },
    );
    return true;
  } catch {
    return false;
  }
}
