import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/partners";

export const dynamic = "force-dynamic";

/**
 * A partner's link: /r/ada4
 *
 * Records the click, remembers the partner in a cookie, and sends the visitor to
 * the landing page, which is where the product actually gets sold.
 *
 * FIRST touch wins, and it is enforced here on the server rather than in the
 * browser. If the visitor already carries a referral cookie, we do NOT overwrite
 * it: the partner who introduced them keeps them, even if they later click
 * somebody else's link. A partner can never have a referral taken from them by
 * whoever happened to be last.
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

  try {
    const admin = createAdminClient();
    const { data: partner } = await admin
      .from("partners")
      .select("id")
      .eq("code", clean)
      .eq("active", true)
      .maybeSingle();

    if (!partner) return res;

    // Every click counts, including repeat clicks from the same person. This is
    // "how many times was the link opened", which is what a partner is asking.
    await admin.from("referral_clicks").insert({ partner_id: partner.id });

    // First touch: only set the cookie if they do not already have one.
    const already = request.headers
      .get("cookie")
      ?.split(";")
      .some((c) => c.trim().startsWith(`${REF_COOKIE}=`));

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
