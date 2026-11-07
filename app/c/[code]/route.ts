import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { CREATOR_CODE_COOKIE, CREATOR_COOKIE, CREATOR_COOKIE_DAYS, creatorForCode } from "@/lib/creatorsServer";

export const dynamic = "force-dynamic";

/**
 * Remembers a creator's code on this device, then opens the home page.
 * Reached from glufloat.com/<code> (app/[creator]/page.tsx), which is the
 * link creators share. First touch wins: an existing creator cookie is never
 * replaced. The person is tied to the creator the first time they open /app
 * (POST /api/creator/attach), so sign-up and its database trigger did not change.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/", request.url));
  const already = (request.headers.get("cookie") ?? "").split(";").some((c) => c.trim().startsWith(`${CREATOR_COOKIE}=`));
  if (already) return res;
  try {
    const c = await creatorForCode(createAdminClient(), String(code ?? ""));
    if (c) {
      const opts = { path: "/", maxAge: CREATOR_COOKIE_DAYS * 86400, sameSite: "lax" as const };
      res.cookies.set(CREATOR_COOKIE, c.id, { ...opts, httpOnly: true });
      // Readable, display only: lets the home page and sign-up say "Code FAITH added".
      res.cookies.set(CREATOR_CODE_COOKIE, c.code, opts);
    }
  } catch {
    /* A lookup failure must never stop somebody reaching the site. */
  }
  return res;
}
