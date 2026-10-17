import type { createAdminClient } from "@/lib/supabase/server";
import { newCode, readableToken } from "@/lib/hospitalServer";
import { DOCTOR_ACCESS_UNTIL, DOCTOR_SEATS } from "@/lib/hospitalPlans";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { doctorSetupEmail, sendEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";

/**
 * Making a doctor's practice, shared by the public sign-up (/doctors/start)
 * and GluFloat adding a doctor by hand (/admin/doctors, founder 2026-10-17:
 * "GluFloat should be able to add doctors themselves without field agents").
 * One place, so the two can never make a different kind of doctor.
 */
type Admin = ReturnType<typeof createAdminClient>;

export const DOCTOR_INVITE_DAYS = 14;

export type DoctorInput = { name: string; email: string; mdcn: string };

/**
 * Clean and check a doctor's details. Returns an error sentence, or the clean
 * values. "self" is the doctor typing (their sign-up keeps its own words);
 * "admin" is GluFloat typing for them.
 */
export function cleanDoctor(body: Record<string, unknown>, who: "self" | "admin"): DoctorInput | { error: string } {
  const your = who === "self" ? "your" : "the doctor's";
  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  let name = clip(body.name, 120);
  const email = clip(body.email, 200).toLowerCase();
  const mdcn = clip(body.mdcn, 40).toUpperCase();
  if (!name) return { error: `Please put ${your} name.` };
  if (!/^dr\.?\s/i.test(name)) name = `Dr ${name}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPhoneLoginEmail(email)) return { error: `Please put ${your} email address.` };
  if (!/^[A-Z0-9][A-Z0-9/ .-]{2,39}$/.test(mdcn)) return { error: `Please put ${your} MDCN folio number.` };
  return { name, email, mdcn };
}

/** A one-time set-up link for this practice, emailed to the doctor. */
export async function sendDoctorSetupLink(
  admin: Admin,
  practiceId: string,
  name: string,
  email: string,
): Promise<{ emailed: boolean; link: string | null }> {
  const token = readableToken(name, true);
  const { error } = await admin.from("hospital_invites").insert({
    token,
    hospital_id: practiceId,
    role: "admin",
    name,
    email,
    expires_at: new Date(Date.now() + DOCTOR_INVITE_DAYS * 86400000).toISOString(),
  });
  if (error) return { emailed: false, link: null };
  const link = `${SITE_URL}/doctors/setup/${token}`;
  const firstName = name.replace(/^dr\.?\s+/i, "").split(/\s+/)[0] || name;
  const mail = doctorSetupEmail(firstName, link, DOCTOR_INVITE_DAYS);
  const sent = await sendEmail(email, mail.subject, mail.html, mail.text, "doctor-setup");
  return { emailed: sent.ok, link };
}

/** Insert the practice. Retries a clash on the random code; null on any other failure. */
export async function insertDoctorPractice(
  admin: Admin,
  d: DoctorInput & { agentId: string | null; invitedBy: string | null },
): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await admin
      .from("hospitals")
      .insert({
        code: newCode(),
        kind: "doctor",
        name: d.name,
        contact_name: d.name,
        contact_role: "Doctor",
        contact_email: d.email,
        mdcn_number: d.mdcn,
        status: "active",
        plan: "doctor",
        seats: DOCTOR_SEATS,
        access_until: DOCTOR_ACCESS_UNTIL,
        approved_at: new Date().toISOString(),
        agent_id: d.agentId,
        invited_by: d.invitedBy,
      })
      .select("id")
      .single();
    if (!error && data) return data.id as string;
    if (error && !/duplicate|unique/i.test(error.message)) return null;
  }
  return null;
}

/** An open (not switched-off) doctor already on this email, if any. */
export async function doctorByEmail(admin: Admin, email: string): Promise<string | null> {
  const { data } = await admin
    .from("hospitals")
    .select("id")
    .eq("kind", "doctor")
    .eq("contact_email", email)
    .neq("status", "declined")
    .limit(1);
  return data && data.length > 0 ? (data[0].id as string) : null;
}
