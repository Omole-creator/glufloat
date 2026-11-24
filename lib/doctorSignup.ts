import type { createAdminClient } from "@/lib/supabase/server";
import { newCode, readableToken } from "@/lib/hospitalServer";
import { DOCTOR_ACCESS_UNTIL, DOCTOR_SEATS, NURSE_ROLE } from "@/lib/hospitalPlans";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { normalizePhone } from "@/lib/phone";
import { doctorSetupEmail, sendEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";

/**
 * Making a doctor's practice, shared by the public sign-up (/doctors/start)
 * and Glufloat adding a doctor by hand (/admin/doctors, founder 2026-10-17:
 * "Glufloat should be able to add doctors themselves without field agents").
 * One place, so the two can never make a different kind of doctor.
 */
type Admin = ReturnType<typeof createAdminClient>;

export const DOCTOR_INVITE_DAYS = 14;

/**
 * `nurse` (founder, 2026-11-24): a nurse partner, added only by Glufloat in
 * /admin/doctors with the Type drop-down. Same practice row, contact_role
 * 'Nurse' (lib/hospitalPlans.ts isNursePractice). `mdcn` then holds her NMCN
 * licence number, optional like a doctor's.
 */
export type DoctorInput = { name: string; email: string; mdcn: string | null; phone: string | null; nurse: boolean };

/**
 * Clean and check a doctor's details. Returns an error sentence, or the clean
 * values. "self" is the doctor typing (their sign-up keeps its own words);
 * "admin" is Glufloat typing for them.
 *
 * WhatsApp/phone number (founder, 2026-11-15): required on sign-up and when
 * Glufloat adds a doctor. Optional only on admin Edit (phoneRequired false),
 * because doctors who joined before 2026-11-15 have none. Stored in one shape
 * (normalizePhone). Patients never see it: the chat gives a doctor no call
 * number (lib/chatServer.ts patientTeam).
 */
export function cleanDoctor(
  body: Record<string, unknown>,
  who: "self" | "admin",
  phoneRequired = true,
): DoctorInput | { error: string } {
  const nurse = who === "admin" && body.type === "nurse";
  const your = who === "self" ? "your" : nurse ? "the nurse's" : "the doctor's";
  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  let name = clip(body.name, 120);
  const email = clip(body.email, 200).toLowerCase();
  const mdcn = clip(body.mdcn, 40).toUpperCase();
  if (!name) return { error: `Please put ${your} name.` };
  if (!nurse && !/^dr\.?\s/i.test(name)) name = `Dr ${name}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPhoneLoginEmail(email)) return { error: `Please put ${your} email address.` };
  // Optional (founder, 2026-11-14): many doctors will not share it. If typed, it must look like a number.
  if (mdcn && !/^[A-Z0-9][A-Z0-9/ .-]{2,39}$/.test(mdcn)) return { error: `Please check ${your} ${nurse ? "NMCN licence" : "MDCN folio"} number, or leave it empty.` };
  const rawPhone = clip(body.phone, 40);
  const digits = rawPhone.replace(/\D/g, "");
  if ((phoneRequired || rawPhone) && digits.length < 10)
    return { error: `Please put ${your} WhatsApp or phone number.` };
  return { name, email, mdcn: mdcn || null, phone: digits ? normalizePhone(rawPhone) : null, nurse };
}

/** A one-time set-up link for this practice, emailed to the doctor. */
export async function sendDoctorSetupLink(
  admin: Admin,
  practiceId: string,
  name: string,
  email: string,
  nurse = false,
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
  const mail = doctorSetupEmail(firstName, link, DOCTOR_INVITE_DAYS, nurse);
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
        contact_role: d.nurse ? NURSE_ROLE : "Doctor",
        contact_email: d.email,
        mdcn_number: d.mdcn,
        contact_phone: d.phone,
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
