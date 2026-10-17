import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { acceptsPatients, isDoctorPractice, orgWords, PRACTICE_TRIAL_DAYS, waitingForFirstPatient } from "@/lib/hospitalPlans";
import { isPatientPays, PATIENT_FREE_DAYS } from "@/lib/patientPays";
import { ownPaidMsLeft, seatsUsed, sessionUser, type HospitalRow, type PatientRow } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";
import { isPhoneLoginEmail, phoneLoginEmail } from "@/lib/phoneLogin";

export const dynamic = "force-dynamic";

/**
 * A patient joins their hospital, from the poster link (/j/CODE) or their own
 * invite (/j/CODE?t=TOKEN).
 *
 *  - Signed in already: their account is added to the hospital.
 *  - New: an account is made here on the server (phone + password, email if
 *    they have one), then the browser signs in with the address we hand back.
 *
 * The patient's place: 'active' while the hospital has a free place, otherwise
 * 'waiting' (founder's call: nobody is turned away; a waiting patient uses the
 * normal 7-day trial and the hospital admin sees them in the queue).
 *
 * A walk-in whose phone matches a patient the hospital already typed in is
 * linked to that row SILENTLY. The page never says "we found you", because that
 * would tell anyone with the poster which phone numbers belong to patients.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const token = String(body.token ?? "").trim() || null;
  const useSession = body.useSession === true;

  const admin = createAdminClient();
  const { data: hospital, error: hErr } = await admin.from("hospitals").select("*").eq("code", code).maybeSingle();
  if (hErr) return NextResponse.json({ error: "GluFloat could not open this just now. Please try again." }, { status: 503 });
  if (!hospital) return NextResponse.json({ error: "This link is not right. Please ask your hospital for it again." }, { status: 404 });
  const h = hospital as HospitalRow;
  const w = orgWords(h);
  // A dietitian with no patient yet is open too: her 14 free days start with
  // the first patient who joins (below), not when she signed up.
  if (!acceptsPatients(h))
    return NextResponse.json({ error: `${w.Yours}'s GluFloat is not open right now. Please speak to ${w.yours}.` }, { status: 410 });

  let invite: PatientRow | null = null;
  if (token) {
    const { data } = await admin
      .from("hospital_patients")
      .select("*")
      .eq("hospital_id", h.id)
      .eq("invite_token", token)
      .eq("status", "invited")
      .is("user_id", null)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: `This invite has already been used, or it is not right. Please ask ${w.yours}.` }, { status: 404 });
    invite = data as PatientRow;
  }

  // Who is joining.
  let uid: string;
  let phone: string;
  let createdLogin: string | null = null;
  const session = useSession ? await sessionUser() : null;

  if (session) {
    uid = session.id;
    const { data: profile } = await admin.from("profiles").select("phone").eq("id", uid).maybeSingle();
    phone = normalizePhone((profile?.phone as string | null) ?? "");
  } else {
    phone = normalizePhone(String(body.phone ?? ""));
    const name = String(body.name ?? "").trim().slice(0, 120) || invite?.name || "";
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (phone.length < 10) return NextResponse.json({ error: "Please put your phone number." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Please put your name." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Your password needs 6 or more letters or numbers." }, { status: 400 });
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPhoneLoginEmail(email)))
      return NextResponse.json({ error: "That email does not look right. You can leave it empty." }, { status: 400 });
    if (invite && normalizePhone(invite.phone) !== phone)
      return NextResponse.json({ error: `This is not the phone number ${w.yours} has for you. Please check it, or ask ${w.yours}.` }, { status: 400 });

    const loginEmail = email || phoneLoginEmail(phone);
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: { name, phone, user_type: "diabetic", source_post: null, partner_code: null },
    });
    if (cErr || !created.user) {
      if (/already|registered|exists/i.test(cErr?.message ?? ""))
        return NextResponse.json(
          { needLogin: true, error: "You already have a GluFloat account. Log in first, then open this link again." },
          { status: 409 },
        );
      return NextResponse.json({ error: "We could not make your account just now. Please try again." }, { status: 503 });
    }
    uid = created.user.id;
    createdLogin = loginEmail;
  }

  // Already in this hospital? Nothing to do.
  const { data: mine } = await admin
    .from("hospital_patients")
    .select("*")
    .eq("hospital_id", h.id)
    .eq("user_id", uid)
    .neq("status", "removed")
    .maybeSingle();
  if (mine && (mine as PatientRow).status !== "invited")
    return NextResponse.json({ ok: true, status: (mine as PatientRow).status, login: createdLogin, doctor: isDoctorPractice(h) });

  // Which row is theirs: the invite, a row with their phone, or a new one.
  let row: PatientRow | null = invite ?? (mine as PatientRow | null);
  if (!row && phone) {
    const { data } = await admin
      .from("hospital_patients")
      .select("*")
      .eq("hospital_id", h.id)
      .eq("phone", phone)
      .eq("status", "invited")
      .is("user_id", null)
      .maybeSingle();
    row = (data as PatientRow | null) ?? null;
  }

  const used = await seatsUsed(admin, h.id);
  const status: "active" | "waiting" = used < h.seats ? "active" : "waiting";
  // A GluFloat doctor's patient is linked, not covered: they keep paying for
  // their own plan, so no paid days are set aside.
  const doctorPractice = isDoctorPractice(h);
  const carried = status === "active" && !doctorPractice ? await ownPaidMsLeft(admin, uid) : 0;
  const now = new Date().toISOString();
  const patch = {
    user_id: uid,
    status,
    joined_at: now,
    carried_ms: carried > 0 ? carried : null,
  };

  let rowId: string;
  if (row) {
    if (row.user_id && row.user_id !== uid)
      return NextResponse.json({ error: `This invite has already been used. Please ask ${w.yours}.` }, { status: 409 });
    const { error } = await admin.from("hospital_patients").update(patch).eq("id", row.id);
    if (error) return NextResponse.json({ error: "We could not add you just now. Please try again." }, { status: 503 });
    rowId = row.id;
  } else {
    const { data: profile } = await admin.from("profiles").select("name,phone,email").eq("id", uid).maybeSingle();
    const { data: ins, error } = await admin
      .from("hospital_patients")
      .insert({
        hospital_id: h.id,
        name: ((profile?.name as string | null) ?? String(body.name ?? "")).trim() || "Patient",
        phone: phone || normalizePhone((profile?.phone as string | null) ?? "") || "unknown",
        email: isPhoneLoginEmail(profile?.email as string) ? null : ((profile?.email as string | null) ?? null),
        ...patch,
      })
      .select("id")
      .single();
    if (error || !ins) {
      // Their phone is already on another live row here (e.g. a family member's).
      if (/duplicate|unique/i.test(error?.message ?? ""))
        return NextResponse.json({ error: `This phone number is already with ${w.yours}. Please speak to ${w.yours}.` }, { status: 409 });
      return NextResponse.json({ error: "We could not add you just now. Please try again." }, { status: 503 });
    }
    rowId = ins.id as string;
  }

  // Two people joining at the same moment could both take the last place.
  // Check again, and the later one waits.
  let finalStatus = status;
  if (status === "active" && (await seatsUsed(admin, h.id)) > h.seats) {
    await admin.from("hospital_patients").update({ status: "waiting", carried_ms: null }).eq("id", rowId);
    finalStatus = "waiting";
  }

  // The patient's own payment countdown starts at 30 days (patient-paid-schema.sql),
  // or at 14 free days with a dietitian whose patients pay her in the app
  // (patient-pays-schema.sql, founder 2026-10-17). Its own write: a database
  // without the column still lets them join.
  if (finalStatus === "active" && !doctorPractice) {
    const days = isPatientPays(h) ? PATIENT_FREE_DAYS : 30;
    await admin
      .from("hospital_patients")
      .update({ paid_until: new Date(Date.now() + days * 86400000).toISOString() })
      .eq("id", rowId)
      .is("paid_until", null);
  }

  // A dietitian's first patient starts her 14 free days. Only the row whose
  // end is still empty is touched, so two first patients at once start it once.
  if (finalStatus === "active" && waitingForFirstPatient(h)) {
    await admin
      .from("hospitals")
      .update({
        access_until: new Date(Date.now() + PRACTICE_TRIAL_DAYS * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", h.id)
      .is("access_until", null);
  }

  return NextResponse.json({ ok: true, status: finalStatus, login: createdLogin, doctor: doctorPractice });
}
