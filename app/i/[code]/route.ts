import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { INVITE_COOKIE, INVITE_COOKIE_DAYS, inviterFor } from "@/lib/referral";

export const dynamic = "force-dynamic";

/**
 * A member's invite link: /i/ada-k7m3pq (lib/referral.ts).
 *
 * Remembers who invited this visitor in a cookie, then sends them to the home
 * page like any other visitor. First invite wins: an existing cookie is never
 * overwritten. The account is tied to the inviter later, the first time the
 * new member opens /app (POST /api/referral), so the sign-up form and the
 * sign-up trigger did not have to change.
 *
 * Separate from the partner link /r/<code> on purpose (lib/partners.ts): that
 * one pays a health worker money, this one gives a member free days.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/", request.url));
  const clean = (code ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,40}$/.test(clean)) return res;

  const already = (request.headers.get("cookie") ?? "")
    .split(";")
    .some((c) => c.trim().startsWith(`${INVITE_COOKIE}=`));
  if (already) return res;

  try {
    const inviter = await inviterFor(createAdminClient(), clean);
    if (inviter) {
      res.cookies.set(INVITE_COOKIE, inviter, {
        path: "/",
        maxAge: INVITE_COOKIE_DAYS * 24 * 60 * 60,
        sameSite: "lax",
        httpOnly: true, // only the server reads it
      });
    }
  } catch {
    /* An invite failure must never stop somebody reaching the site. */
  }
  return res;
}
