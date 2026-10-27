import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE, REFERRAL_DAYS, attachInvite, inviteCodeFor } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";
import { REP_PATIENT_COOKIE, attachRepPatient } from "@/lib/repPatients";

export const dynamic = "force-dynamic";

/**
 * GET: the signed-in member's invite link and how many friends have earned
 * them days. Returns { ready: false } until supabase/referral-schema.sql has
 * been run, and the invite card then shows nothing.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ready: false }, { status: 401 });

  const admin = createAdminClient();
  const code = await inviteCodeFor(admin, user.id);
  if (!code) return NextResponse.json({ ready: false });

  const { count } = await admin
    .from("referral_rewards")
    .select("referred_user_id", { count: "exact", head: true })
    .eq("referrer_user_id", user.id);
  const rewarded = count ?? 0;
  return NextResponse.json({
    ready: true,
    link: `${SITE_URL}/i/${code}`,
    rewarded,
    daysEarned: rewarded * REFERRAL_DAYS,
    days: REFERRAL_DAYS,
  });
}

/**
 * POST: tie this (new) account to whoever invited it, from the invite cookie.
 * Called once when /app opens. Identity comes from the session, the inviter from
 * an httpOnly cookie the browser cannot write, and lib/referral.ts refuses old
 * accounts, accounts that have paid, and self-invites.
 */
export async function POST() {
  const jar = await cookies();
  const inviter = jar.get(INVITE_COOKIE)?.value;
  // A rep's patient link (/p/<code>, lib/repPatients.ts) is tied on the same call.
  const rep = jar.get(REP_PATIENT_COOKIE)?.value;
  if (!inviter && !rep) return NextResponse.json({ ok: false });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createAdminClient();
  const attached = inviter ? await attachInvite(admin, user.id, inviter) : false;
  const repAttached = rep ? await attachRepPatient(admin, user.id, rep) : false;
  const res = NextResponse.json({ ok: attached, rep: repAttached });
  // Either way each cookie has done its job on this device.
  if (inviter) res.cookies.set(INVITE_COOKIE, "", { path: "/", maxAge: 0 });
  if (rep) res.cookies.set(REP_PATIENT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
