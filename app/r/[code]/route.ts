import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  CLICK_COOKIE,
  CLICK_COOKIE_DAYS,
  REF_COOKIE,
  REF_COOKIE_DAYS,
} from "@/lib/partners";

export const dynamic = "force-dynamic";

/**
 * A partner's link: /r/ada4
 *
 * Counts the person, remembers the partner in a cookie, and sends the visitor to
 * the landing page, which is where the product actually gets sold.
 *
 * ONE PERSON IS COUNTED ONCE, FOR GOOD. Clicking the same link ten times is one
 * row, not ten. The number on a partner's dashboard is meant to be "how many
 * people did my link reach", and a nurse opening her own link to show it to a
 * patient must not inflate it.
 *
 * FIRST touch wins, and it is enforced here on the server rather than in the
 * browser. If the visitor already carries a referral cookie, we do NOT overwrite
 * it: the partner who introduced them keeps them, even if they later click
 * somebody else's link. A partner can never have a referral taken from them by
 * whoever happened to be last.
 *
 * The two cookies are separate on purpose and answer different questions.
 * `gf_ref` is "who gets paid for this person" and can only ever be one partner.
 * `gf_clk` is "whose links has this person already been counted for" and is a
 * list, so somebody who clicks Ada's link and later Tunde's is a person each of
 * them genuinely reached, while the money still belongs to Ada.
 *
 * An unknown or switched-off code is not an error the visitor should ever see.
 * They just land on the home page like any other visitor.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const home = new URL("/", request.url);
  const res = NextResponse.redirect(home);

  const clean = (code ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,40}$/.test(clean)) return res;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const readCookie = (name: string) =>
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? "";

  try {
    const admin = createAdminClient();
    const { data: partner } = await admin
      .from("partners")
      .select("id")
      .eq("code", clean)
      .eq("active", true)
      .maybeSingle();

    if (!partner) return res;

    // Have we already counted this person for THIS partner? If so, they are not
    // a new person, and nothing is written. Ten taps stay one row.
    const counted = readCookie(CLICK_COOKIE)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (!counted.includes(clean)) {
      await admin.from("referral_clicks").insert({ partner_id: partner.id });
      res.cookies.set(CLICK_COOKIE, [...counted, clean].join(","), {
        path: "/",
        maxAge: CLICK_COOKIE_DAYS * 24 * 60 * 60,
        sameSite: "lax",
        httpOnly: true, // nothing in the browser reads this; only this route does
      });
    }

    // First touch: only set the cookie if they do not already have one.
    const already = !!readCookie(REF_COOKIE);

    if (!already) {
      res.cookies.set(REF_COOKIE, clean, {
        path: "/",
        maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
        sameSite: "lax",
        // Readable by the sign-up form, which is the whole point. It holds a
        // partner code, not anything private.
        httpOnly: false,
      });
    }
  } catch {
    /* A tracking failure must never stop somebody reaching the site. */
  }

  return res;
}
