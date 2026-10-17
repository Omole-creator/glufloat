import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { newCode, sessionUser } from "@/lib/hospitalServer";
import { DOCTOR_ACCESS_UNTIL, DOCTOR_SEATS, PRACTICE_TRIAL_SEATS } from "@/lib/hospitalPlans";
import { PATIENT_PAYS_PLAN } from "@/lib/patientPays";
import { normalizePhone } from "@/lib/phone";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { notifyFounder } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import { isInternalEmail } from "@/lib/internalAccounts";

export const dynamic = "force-dynamic";

/**
 * A dietitian starts GluFloat for dietitians, from /dietitians/start
 * (founder's decisions, 2026-10-13):
 *
 *  - She signs up herself and her practice opens at once. She gives her DCN
 *    registration number; GluFloat checks it afterwards and can switch her off
 *    in /admin/dietitians. The founder is emailed about every new one.
 *  - 14 free days for 5 patients. The practice starts with no end date
 *    (access_until null); the first patient who joins starts the 14 days
 *    (/api/hospital/join).
 *  - She is the practice's admin AND the dietitian her patients chat with
 *    (lib/hospitalServer.ts chatContacts).
 *
 * Signed in: her account is used. New: an account is made here (email +
 * password, so "Forgot your password?" works for her) and the browser signs
 * in with it, the same as a hospital staff invite.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // A hidden field people never see. A bot fills every box it finds.
  if (String(body.website ?? "").trim()) return NextResponse.json({ ok: true });

  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  const name = clip(body.name, 120);
  const dcn = clip(body.dcn, 40).toUpperCase();
  const phone = normalizePhone(clip(body.phone, 40));
  const place = clip(body.place, 80);
  const useSession = body.useSession === true;

  if (!name) return NextResponse.json({ error: "Please put your name." }, { status: 400 });
  if (!/^[A-Z0-9][A-Z0-9/ .-]{2,39}$/.test(dcn))
    return NextResponse.json({ error: "Please put your DCN registration number." }, { status: 400 });
  if (phone.length < 10) return NextResponse.json({ error: "Please put your WhatsApp number." }, { status: 400 });

  const admin = createAdminClient();

  // The dietitian tables must exist (supabase/dietitian-practice-schema.sql).
  const ready = await admin.from("hospitals").select("kind").limit(1);
  if (ready.error)
    return NextResponse.json({ error: "GluFloat for dietitians is not open yet. Please try again soon." }, { status: 503 });

  let uid: string;
  let email: string | null;
  let login: string | null = null;
  const session = useSession ? await sessionUser() : null;
  if (session) {
    uid = session.id;
    email = session.email;
  } else {
    email = clip(body.email, 200).toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPhoneLoginEmail(email))
      return NextResponse.json({ error: "Please put your email address." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Your password needs 6 or more letters or numbers." }, { status: 400 });
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, user_type: "health_pro", source_post: null, partner_code: null },
    });
    if (error || !created.user) {
      if (/already|registered|exists/i.test(error?.message ?? ""))
        return NextResponse.json(
          { needLogin: true, error: "You already have a GluFloat account with this email. Log in first, then open this page again." },
          { status: 409 },
        );
      return NextResponse.json({ error: "We could not make your account just now. Please try again." }, { status: 503 });
    }
    uid = created.user.id;
    login = email;
  }

  // Already runs a practice? Then this is just the way back in.
  const { data: mine } = await admin.from("hospital_staff").select("role,hospitals(id,kind,status)").eq("user_id", uid);
  const existing = ((mine ?? []) as unknown as { role: string; hospitals: { kind?: string; status: string } | null }[]).find(
    (r) => r.role === "admin" && r.hospitals?.kind === "dietitian" && r.hospitals.status !== "declined",
  );
  if (existing) return NextResponse.json({ ok: true, login });

  let practiceId: string | null = null;
  let code = "";
  // Patients pay her in the app (patient-pays-schema.sql, founder 2026-10-17):
  // the practice never runs out and has no limit on patients; each patient's
  // own 14 free days and payments decide who is covered. Until #32 has run
  // the plan name is refused, so it falls back to the old free start once.
  let patientPays = true;
  for (let attempt = 0; attempt < 5 && !practiceId; attempt++) {
    code = newCode();
    const { data, error } = await admin
      .from("hospitals")
      .insert({
        code,
        kind: "dietitian",
        name,
        contact_name: name,
        contact_role: "Dietitian",
        contact_phone: phone,
        contact_email: email,
        city: place || null,
        dcn_number: dcn,
        approved_at: new Date().toISOString(),
        ...(patientPays
          ? { status: "active", plan: PATIENT_PAYS_PLAN, seats: DOCTOR_SEATS, access_until: DOCTOR_ACCESS_UNTIL }
          : // Empty end on purpose: the old 14 days started with her first patient.
            { status: "pilot", plan: "pilot", seats: PRACTICE_TRIAL_SEATS, access_until: null }),
      })
      .select("id")
      .single();
    if (!error && data) practiceId = data.id as string;
    else if (patientPays && /check constraint|hospitals_plan_check/i.test(error?.message ?? "")) patientPays = false;
    else if (!/duplicate|unique/i.test(error?.message ?? "")) break;
  }
  if (!practiceId) return NextResponse.json({ error: "We could not set up your practice just now. Please try again." }, { status: 503 });

  const { error: sErr } = await admin.from("hospital_staff").insert({ hospital_id: practiceId, user_id: uid, role: "admin", name, phone });
  if (sErr) {
    await admin.from("hospitals").delete().eq("id", practiceId);
    return NextResponse.json({ error: "We could not set up your practice just now. Please try again." }, { status: 503 });
  }

  // Test and team accounts (lib/internalAccounts.ts) do not email the founder.
  if (!isInternalEmail(email))
    await notifyFounder(
    `New dietitian: ${name}`,
    [
      ["Name", name],
      ["DCN number", dcn],
      ["WhatsApp", phone],
      ["Email", email],
      ["Where", place],
      ["Code", code],
    ],
    `${SITE_URL}/admin/dietitians`,
  ).catch(() => null);

  return NextResponse.json({ ok: true, login });
}
