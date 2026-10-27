import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { REP_PATIENT_COOKIE, REP_PATIENT_COOKIE_DAYS, repForCode } from "@/lib/repPatients";

export const dynamic = "force-dynamic";

/**
 * A rep's link for patients: /p/<ref_code> (lib/repPatients.ts). Remembers
 * the rep in a hidden cookie, then opens the home page like any visitor.
 * First touch wins: an existing cookie is never overwritten.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/", request.url));
  const raw = String(code ?? "").trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(raw)) return res;
  const already = (request.headers.get("cookie") ?? "").split(";").some((c) => c.trim().startsWith(`${REP_PATIENT_COOKIE}=`));
  if (already) return res;
  try {
    const agentId = await repForCode(createAdminClient(), raw);
    if (agentId)
      res.cookies.set(REP_PATIENT_COOKIE, agentId, {
        path: "/",
        maxAge: REP_PATIENT_COOKIE_DAYS * 86400,
        sameSite: "lax",
        httpOnly: true,
      });
  } catch {
    /* A lookup failure must never stop a patient reaching the site. */
  }
  return res;
}
