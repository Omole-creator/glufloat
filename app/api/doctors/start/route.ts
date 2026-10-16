import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { newCode, readableToken } from "@/lib/hospitalServer";
import { DOCTOR_ACCESS_UNTIL, DOCTOR_SEATS } from "@/lib/hospitalPlans";
import { doctorsReady } from "@/lib/careFeesServer";
import { doctorRefFromHeader, parseDoctorRef } from "@/lib/doctorRef";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { doctorSetupEmail, notifyFounder, sendEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import { isInternalEmail } from "@/lib/internalAccounts";

export const dynamic = "force-dynamic";

const INVITE_DAYS = 14;

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

  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  let name = clip(body.name, 120);
  const email = clip(body.email, 200).toLowerCase();
  const mdcn = clip(body.mdcn, 40).toUpperCase();

  if (!name) return NextResponse.json({ error: "Please put your name." }, { status: 400 });
  if (!/^dr\.?\s/i.test(name)) name = `Dr ${name}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPhoneLoginEmail(email))
    return NextResponse.json({ error: "Please put your email address." }, { status: 400 });
  if (!/^[A-Z0-9][A-Z0-9/ .-]{2,39}$/.test(mdcn))
    return NextResponse.json({ error: "Please put your MDCN folio number." }, { status: 400 });

  const admin = createAdminClient();
  if (!(await doctorsReady(admin)))
    return NextResponse.json({ error: "GluFloat for doctors is not open yet. Please try again soon." }, { status: 503 });

  const firstName = name.replace(/^dr\.?\s+/i, "").split(/\s+/)[0] || name;

  // Make a one-time set-up link for this practice and email it.
  const sendLink = async (practiceId: string): Promise<{ emailed: boolean; link: string | null }> => {
    const token = readableToken(name, true);
    const { error } = await admin.from("hospital_invites").insert({
      token,
      hospital_id: practiceId,
      role: "admin",
      name,
      email,
      expires_at: new Date(Date.now() + INVITE_DAYS * 86400000).toISOString(),
    });
    if (error) return { emailed: false, link: null };
    const link = `${SITE_URL}/doctors/setup/${token}`;
    const mail = doctorSetupEmail(firstName, link, INVITE_DAYS);
    const sent = await sendEmail(email, mail.subject, mail.html, mail.text, "doctor-setup");
    return { emailed: sent.ok, link };
  };
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
  const { data: same } = await admin
    .from("hospitals")
    .select("id,status")
    .eq("kind", "doctor")
    .eq("contact_email", email)
    .neq("status", "declined")
    .limit(1);
  if (same && same.length > 0) return reply(await sendLink(same[0].id as string), true);

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
    const { data: c } = await admin.from("hospitals").select("id,kind,status").eq("id", ref.colleagueId).maybeSingle();
    if (c && c.kind === "doctor" && c.status === "active") invitedBy = c.id as string;
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await admin
      .from("hospitals")
      .insert({
        code: newCode(),
        kind: "doctor",
        name,
        contact_name: name,
        contact_role: "Doctor",
        contact_email: email,
        mdcn_number: mdcn,
        status: "active",
        plan: "doctor",
        seats: DOCTOR_SEATS,
        access_until: DOCTOR_ACCESS_UNTIL,
        approved_at: new Date().toISOString(),
        agent_id: agentId,
        invited_by: invitedBy,
      })
      .select("id")
      .single();
    if (!error && data) {
      const r = await sendLink(data.id as string);
      if (!isInternalEmail(email))
        await notifyFounder(
          `New doctor: ${name}${r.emailed ? "" : " (set-up email did not send)"}`,
          [
            ["Name", name],
            ["MDCN folio number", mdcn],
            ["Email", email],
            ["Brought by", agentName ? `Field agent: ${agentName}` : invitedBy ? "A colleague's invite" : "Nobody (signed up alone)"],
            ["Set-up link emailed", r.emailed ? "Yes" : "No"],
          ],
          `${SITE_URL}/admin/doctors`,
        ).catch(() => null);
      return reply(r);
    }
    if (error && !/duplicate|unique/i.test(error.message))
      return NextResponse.json({ error: "We could not set you up just now. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ error: "Please try again." }, { status: 503 });
}
