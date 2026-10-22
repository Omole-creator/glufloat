import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { doctorsReady } from "@/lib/careFeesServer";
import { doctorRefFromHeader, parseDoctorRef } from "@/lib/doctorRef";
import { notifyFounder } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import { isInternalEmail } from "@/lib/internalAccounts";
import { cleanDoctor, doctorByEmail, insertDoctorPractice, sendDoctorSetupLink } from "@/lib/doctorSignup";

export const dynamic = "force-dynamic";

/**
 * A doctor signs up for GluFloat for doctors, from /doctors/start (founder's
 * decisions, 2026-10-16):
 *
 *  - Nothing is approved by hand. The practice opens at once and the doctor
 *    gets an email with a link to finish setting up (their password).
 *  - Who brought them comes from the hidden cookie the /d/<code> link set
 *    (lib/doctorRef.ts). The doctor never types or sees a code.
 *  - No phone number: doctors do not like to share theirs.
 *
 * The same email asking again gets a fresh link to the same practice, never a
 * second practice.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // A hidden field people never see. A bot fills every box it finds.
  if (String(body.website ?? "").trim()) return NextResponse.json({ ok: true, emailed: true });

  // The checks and the practice itself are shared with /admin/doctors (lib/doctorSignup.ts).
  const c = cleanDoctor(body, "self");
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const { name, email, mdcn } = c;

  const admin = createAdminClient();
  if (!(await doctorsReady(admin)))
    return NextResponse.json({ error: "GluFloat for doctors is not open yet. Please try again soon." }, { status: 503 });

  // Only off the live site is the link handed back on screen (for testing).
  // On the live site it goes by email only, which is what proves the address.
  const reply = (r: { emailed: boolean; link: string | null }, again = false) =>
    NextResponse.json({
      ok: true,
      emailed: r.emailed,
      again,
      link: !r.emailed && process.env.VERCEL_ENV !== "production" ? r.link : null,
    });

  // Already signed up with this email? A fresh link to the same practice.
  const same = await doctorByEmail(admin, email);
  if (same) return reply(await sendDoctorSetupLink(admin, same, name, email), true);

  // Who brought them: a field agent, or a colleague (never both).
  const ref = parseDoctorRef(doctorRefFromHeader(request.headers.get("cookie")));
  let agentId: string | null = null;
  let invitedBy: string | null = null;
  let agentName: string | null = null;
  if (ref && "agentId" in ref) {
    const { data: a } = await admin.from("field_agents").select("id,name,status").eq("id", ref.agentId).maybeSingle();
    if (a && a.status === "active") {
      agentId = a.id as string;
      agentName = a.name as string;
    }
  } else if (ref && "colleagueId" in ref) {
    const { data: col } = await admin.from("hospitals").select("id,kind,status").eq("id", ref.colleagueId).maybeSingle();
    if (col && col.kind === "doctor" && col.status === "active") invitedBy = col.id as string;
  }

  const id = await insertDoctorPractice(admin, { name, email, mdcn, agentId, invitedBy });
  if (!id) return NextResponse.json({ error: "We could not set you up just now. Please try again." }, { status: 503 });
  const r = await sendDoctorSetupLink(admin, id, name, email);
  if (!isInternalEmail(email))
    await notifyFounder(
      `New doctor: ${name}${r.emailed ? "" : " (set-up email did not send)"}`,
      [
        ["Name", name],
        ["MDCN folio number", mdcn],
        ["Email", email],
        ["Brought by", agentName ? `Doctor acquisition rep: ${agentName}` : invitedBy ? "A colleague's invite" : "Nobody (signed up alone)"],
        ["Set-up link emailed", r.emailed ? "Yes" : "No"],
      ],
      `${SITE_URL}/admin/doctors`,
    ).catch(() => null);
  return reply(r);
}
