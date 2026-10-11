import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE, REFERRAL_DAYS, attachInvite, inviteCodeFor } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";

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
  if (!inviter) return NextResponse.json({ ok: false });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const attached = await attachInvite(createAdminClient(), user.id, inviter);
  const res = NextResponse.json({ ok: attached });
  // Either way the cookie has done its job on this device.
  res.cookies.set(INVITE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
