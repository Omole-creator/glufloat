import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DOCTOR_REF_COOKIE, DOCTOR_REF_DAYS, doctorRefFromHeader } from "@/lib/doctorRef";

export const dynamic = "force-dynamic";

/**
 * The link a field agent gives a doctor (/d/<agent ref code>), or a doctor
 * gives a colleague (/d/<their practice code>). It remembers who brought them
 * in a hidden cookie (lib/doctorRef.ts), then opens the doctor sign-up. The
 * doctor never sees or types a code. First touch wins.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/doctors/start", request.url));
  const raw = String(code ?? "").trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(raw)) return res;
  if (doctorRefFromHeader(request.headers.get("cookie"))) return res;

  try {
    const admin = createAdminClient();
    let value: string | null = null;
    const { data: agent } = await admin.from("field_agents").select("id,status").eq("ref_code", raw.toLowerCase()).maybeSingle();
    if (agent && agent.status === "active") value = `a:${agent.id}`;
    else {
      const { data: practice } = await admin.from("hospitals").select("id,kind,status").eq("code", raw.toUpperCase()).maybeSingle();
      if (practice && practice.kind === "doctor" && practice.status === "active") value = `c:${practice.id}`;
    }
    if (value)
      res.cookies.set(DOCTOR_REF_COOKIE, value, {
        path: "/",
        maxAge: DOCTOR_REF_DAYS * 86400,
        sameSite: "lax",
        httpOnly: true,
      });
  } catch {
    /* A lookup failure must never stop a doctor reaching the sign-up. */
  }
  return res;
}
