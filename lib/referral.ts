/**
 * Invite a friend (built 2026-10-11). A member shares their link
 * (/i/<code>). When somebody who arrived through it pays for the first time,
 * the member gets REFERRAL_DAYS more days.
 *
 * Server-only: every write uses the service-role key, because the three tables
 * (supabase/referral-schema.sql) have no insert/update policy on purpose.
 * Nobody can credit themselves from the browser.
 *
 * Every function here fails quietly (returns null/false) if the schema has not
 * been run yet, because a push here is a release and the code can reach
 * production before the SQL is pasted in. A payment must never fail because
 * the referral side errored.
 *
 * Not to be confused with the PARTNER programme (/r/<code>, lib/partners.ts),
 * which pays health workers money. The two never touch each other: a person can
 * arrive through a nurse's link and a friend's link, and both are credited.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { TRIAL_DAYS } from "@/lib/trial";

export const REFERRAL_DAYS = 5;

/** The invite cookie: the inviter's user id, first touch wins. */
export const INVITE_COOKIE = "gf_inv";
export const INVITE_COOKIE_DAYS = 60;

/** Only a NEW account can be credited to an inviter, not somebody who joined months ago. */
const ATTACH_WITHIN_MS = 30 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Codes are 6 characters with no look-alike letters (no 0/o, 1/l/i), so one
 * read aloud over the phone survives. A first name in front makes the link
 * feel personal: /i/ada-k7m3pq.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function randomCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
function slugName(name: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return first
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "")
    .slice(0, 12);
}

/** This member's invite code, made the first time it is asked for. */
export async function inviteCodeFor(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data: existing, error } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null; // schema not run yet
  if (existing?.code) return existing.code as string;

  const { data: prof } = await admin.from("profiles").select("name").eq("id", userId).maybeSingle();
  const name = slugName((prof?.name as string | null) ?? null);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = name ? `${name}-${randomCode()}` : randomCode();
    const { error: insErr } = await admin.from("referral_codes").insert({ user_id: userId, code });
    if (!insErr) return code;
    // Lost a race to a second tab: read whatever won.
    const { data: again } = await admin
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle();
    if (again?.code) return again.code as string;
  }
  return null;
}

/** Whose invite code this is. */
export async function inviterFor(admin: SupabaseClient, code: string): Promise<string | null> {
  const { data, error } = await admin.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
  if (error || !data) return null;
  return data.user_id as string;
}

/**
 * Tie a freshly signed-up account to the member who invited them. Only for an
 * account made in the last 30 days that has never paid, never to itself, and
 * only once (first invite wins: the primary key on referred_user_id).
 */
export async function attachInvite(
  admin: SupabaseClient,
  userId: string,
  inviterId: string,
): Promise<boolean> {
  if (!inviterId || inviterId === userId) return false;
  const { data: prof } = await admin.from("profiles").select("created_at").eq("id", userId).maybeSingle();
  if (!prof?.created_at || Date.now() - new Date(prof.created_at as string).getTime() > ATTACH_WITHIN_MS) {
    return false;
  }
  const { count } = await admin
    .from("payments")
    .select("reference", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return false;
  const { error } = await admin
    .from("referrals")
    .insert({ referred_user_id: userId, referrer_user_id: inviterId });
  return !error;
}

/**
 * After a payer's payment has been granted: if somebody invited them and this
 * is the first time they have earned that person a reward, give the inviter
 * REFERRAL_DAYS more days.
 *
 *  - A live subscription: its end date moves out by 5 days.
 *  - On a free trial: the trial moves out by 5 days.
 *  - Nothing running: 5 days of access, as a trial (never a fake paid row, which
 *    would count as a paying customer on the admin screens).
 *
 * The reward row is written FIRST and its primary key makes it once-only, so the
 * webhook and the /unlock claim seeing the same payment can never double it.
 */
export async function rewardInviter(
  admin: SupabaseClient,
  payerId: string,
  paymentReference: string,
): Promise<void> {
  try {
    const { data: ref, error } = await admin
      .from("referrals")
      .select("referrer_user_id")
      .eq("referred_user_id", payerId)
      .maybeSingle();
    if (error || !ref) return;
    const inviter = ref.referrer_user_id as string;
    const now = Date.now();

    const { data: sub } = await admin
      .from("subscriptions")
      .select("status,current_period_end")
      .eq("user_id", inviter)
      .maybeSingle();
    const subEnd = sub?.current_period_end ? new Date(sub.current_period_end as string).getTime() : 0;
    const subLive = !!sub && (sub.status === "active" || sub.status === "non-renewing") && subEnd > now;

    const { data: prof } = await admin.from("profiles").select("trial_start").eq("id", inviter).maybeSingle();
    const trialStart = prof?.trial_start ? new Date(prof.trial_start as string).getTime() : null;
    const trialLive = trialStart !== null && now < trialStart + TRIAL_DAYS * DAY_MS;

    const appliedTo = subLive ? "subscription" : "trial";
    const { error: once } = await admin.from("referral_rewards").insert({
      referred_user_id: payerId,
      referrer_user_id: inviter,
      payment_reference: paymentReference,
      days: REFERRAL_DAYS,
      applied_to: appliedTo,
    });
    if (once) return; // already rewarded for this person (or no schema)

    if (subLive) {
      await admin
        .from("subscriptions")
        .update({
          current_period_end: new Date(subEnd + REFERRAL_DAYS * DAY_MS).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", inviter);
    } else {
      // Moving trial_start forward moves the end forward by the same amount.
      // With nothing running, start it so exactly REFERRAL_DAYS are left.
      const start =
        trialLive && trialStart !== null
          ? trialStart + REFERRAL_DAYS * DAY_MS
          : now - (TRIAL_DAYS - REFERRAL_DAYS) * DAY_MS;
      await admin.from("profiles").update({ trial_start: new Date(start).toISOString() }).eq("id", inviter);
    }
  } catch {
    /* A reward must never break a payment. */
  }
}
