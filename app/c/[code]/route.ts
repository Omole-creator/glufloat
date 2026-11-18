import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { CREATOR_CODE_COOKIE, CREATOR_COOKIE, CREATOR_COOKIE_DAYS, VISIT_COOKIE, creatorForCode } from "@/lib/creatorsServer";

export const dynamic = "force-dynamic";

/**
 * Remembers a creator's code on this device, then opens the home page.
 * Reached from glufloat.com/<code> (app/[creator]/page.tsx), which is the
 * link creators share and the QR code on a pharmacy's poster. First touch
 * wins: an existing creator cookie is never replaced. The person is tied to
 * the creator the first time they open /app (POST /api/creator), so sign-up
 * and its database trigger did not change.
 *
 * It also counts a visit, once per device per partner, for good (gf_crv
 * lists the partner ids already counted). Counting does not depend on the
 * first-touch cookie: a device that came through Faith and later scans a
 * pharmacy's poster counts as reached by both, while the money stays with
 * Faith. Same idea as the old partner "people reached".
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/", request.url));
  const cookies = (request.headers.get("cookie") ?? "").split(";").map((c) => c.trim());
  const already = cookies.some((c) => c.startsWith(`${CREATOR_COOKIE}=`));
  const counted = decodeURIComponent(cookies.find((c) => c.startsWith(`${VISIT_COOKIE}=`))?.slice(VISIT_COOKIE.length + 1) ?? "")
    .split(".")
    .filter(Boolean);
  try {
    const admin = createAdminClient();
    const c = await creatorForCode(admin, String(code ?? ""));
    if (c) {
      const opts = { path: "/", maxAge: CREATOR_COOKIE_DAYS * 86400, sameSite: "lax" as const };
      if (!already) {
        res.cookies.set(CREATOR_COOKIE, c.id, { ...opts, httpOnly: true });
        // Readable, display only: lets the home page and sign-up say "Code FAITH added".
        res.cookies.set(CREATOR_CODE_COOKIE, c.code, opts);
      }
      if (!counted.includes(c.id)) {
        // Fails quietly before pharmacy-partners-schema.sql (#42) runs.
        const { error } = await admin.from("creator_link_visits").insert({ creator_id: c.id });
        if (!error)
          res.cookies.set(VISIT_COOKIE, [...counted, c.id].slice(-20).join("."), {
            path: "/",
            maxAge: 400 * 86400,
            sameSite: "lax",
            httpOnly: true,
          });
      }
    }
  } catch {
    /* A lookup failure must never stop somebody reaching the site. */
  }
  return res;
}
