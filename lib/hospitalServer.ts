import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { hospitalLive } from "@/lib/hospitalPlans";
import { normalizePhone } from "@/lib/phone";

/**
 * Server-only helpers for GluFloat for hospitals. Every hospital table has RLS
 * on with NO policies (supabase/hospitals-schema.sql), so everything goes
 * through here: first work out WHO is asking from their session cookie, then
 * read with the service role, never the other way round.
 */

export type StaffRole = "admin" | "doctor" | "dietitian";

export type HospitalRow = {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  est_patients: number | null;
  message: string | null;
  status: "requested" | "pilot" | "active" | "ended" | "declined";
  plan: string | null;
  seats: number;
  access_until: string | null;
  billing: string | null;
  chat_user_id: string | null;
  /** hospital-chat-schema.sql (#23). Missing until it runs. */
  chat_dietitian_id?: string | null;
  chat_doctor_id?: string | null;
  /** dietitian-practice-schema.sql (#25): 'dietitian' for a dietitian's practice. Missing until it runs (a hospital). */
  kind?: "hospital" | "dietitian" | null;
  dcn_number?: string | null;
  created_at: string;
  approved_at: string | null;
};

export type StaffRow = {
  hospital_id: string;
  user_id: string;
  role: StaffRole;
  name: string;
  phone: string | null;
  created_at: string;
};

export type PatientRow = {
  id: string;
  hospital_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  status: "invited" | "active" | "waiting" | "removed" | "paused";
  invite_token: string | null;
  confirmed: boolean;
  created_at: string;
  joined_at: string | null;
  removed_at: string | null;
  carried_ms: number | null;
  carried_restored_at: string | null;
  /** patient-paid-schema.sql (#27): when their payment to the dietitian or hospital runs out. */
  paid_until?: string | null;
  /** patient-pause-schema.sql (#28): time left on the countdown when paused, frozen until unpaused. */
  paused_left_ms?: number | null;
  /** clinician-flags-schema.sql (#29): the before-meal target its clinician set (null = 150). */
  before_target_mgdl?: number | null;
  /** clinician-flags-schema.sql (#29): "Mark as seen" on the red sugar flag. */
  safety_seen_at?: string | null;
  safety_seen_by?: string | null;
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Hospital admin",
  doctor: "Doctor",
  dietitian: "Dietitian",
};

/** No 0/O or 1/I/L, so a code read off a poster is typed right the first time. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newCode(len = 6): string {
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

export function newToken(): string {
  return randomBytes(18).toString("base64url");
}

/**
 * A staff invite link a person can read, that nobody can guess (founder's
 * choice, 2026-10-12): the hospital's name for its admin, or the person's
 * first name for a doctor or dietitian, then 2 digits, then 6 secret letters.
 * "lagoonhospital42-k7m3qp", "chidi42-r8t2wx". The name and digits are for
 * people; the 6 letters (31^6, about 900 million) are what keeps it safe,
 * because the link makes someone able to see patients' health records.
 */
export function readableToken(name: string | null | undefined, firstWordOnly: boolean): string {
  const words = String(name ?? "")
    .toLowerCase()
    .replace(/^(dr|dtn|mr|mrs|ms|prof|pharm|nurse)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const base = (firstWordOnly ? words.slice(0, 1) : words).join("").replace(/[^a-z0-9]/g, "").slice(0, 24) || "glufloat";
  const digits = String(10 + (randomBytes(1)[0] % 90));
  return `${base}${digits}-${newCode(6).toLowerCase()}`;
}

/** `wa.me` wants 2348132097317, not 08132097317. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const local = normalizePhone(phone);
  if (!local) return null;
  if (local.startsWith("0") && local.length === 11) return "234" + local.slice(1);
  return local;
}

/** The signed-in user from the session cookie, or null. */
export async function sessionUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  } catch {
    return null;
  }
}

/** True when the hospital tables exist (the SQL has been pasted in). */
export async function hospitalsReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("hospitals").select("id").limit(1);
  return !error;
}

export type StaffContext = {
  user: { id: string; email: string | null };
  admin: SupabaseClient;
  staff: StaffRow;
  hospital: HospitalRow;
  /** Every hospital this person works for, for the switcher. */
  all: { hospital: HospitalRow; staff: StaffRow }[];
};

/**
 * Who is this staff member, and which hospital are they looking at? `hid` picks
 * one when somebody works for more than one; otherwise the first. Null when the
 * person is not signed in or is nobody's staff.
 */
export async function staffContext(hid?: string | null): Promise<StaffContext | null> {
  const user = await sessionUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("hospital_staff")
    .select("hospital_id,user_id,role,name,phone,created_at,hospitals(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error || !rows || rows.length === 0) return null;
  const all = rows
    .map((r) => {
      const h = (r as unknown as { hospitals: HospitalRow | null }).hospitals;
      const { hospitals: _drop, ...staff } = r as unknown as StaffRow & { hospitals: unknown };
      void _drop;
      return h ? { hospital: h, staff: staff as StaffRow } : null;
    })
    .filter((x): x is { hospital: HospitalRow; staff: StaffRow } => !!x)
    // A declined request never had staff; an ended hospital stays readable so
    // its people can still see their records and the "renew" note.
    .filter((x) => x.hospital.status !== "declined" && x.hospital.status !== "requested");
  if (all.length === 0) return null;
  const pick = all.find((x) => x.hospital.id === hid) ?? all[0];
  return { user, admin, staff: pick.staff, hospital: pick.hospital, all };
}

/** Patients using a place right now. Waiting and invited do not. */
export async function seatsUsed(admin: SupabaseClient, hospitalId: string): Promise<number> {
  const { count } = await admin
    .from("hospital_patients")
    .select("id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId)
    .eq("status", "active");
  return count ?? 0;
}

export type ChatPerson = { name: string; role: StaffRole; whatsapp: string };

/**
 * Who a patient can chat with (founder, 2026-10-12): ONE dietitian and ONE
 * doctor, so a patient whose hospital has both sees both. The hospital admin
 * picks them; with nobody picked (or before hospital-chat-schema.sql runs) it
 * is the first dietitian and the first doctor. Only someone with a phone
 * number can be chatted with. Dietitian first: most questions are about food.
 */
export async function chatContacts(
  admin: SupabaseClient,
  hospital: Pick<HospitalRow, "id" | "chat_dietitian_id" | "chat_doctor_id" | "kind">,
): Promise<ChatPerson[]> {
  const { data } = await admin
    .from("hospital_staff")
    .select("user_id,role,name,phone,created_at")
    .eq("hospital_id", hospital.id)
    .order("created_at", { ascending: true });
  const staff = ((data ?? []) as StaffRow[]).filter((s) => whatsappNumber(s.phone));
  // A dietitian's practice: she runs it (role "admin") and she IS the
  // dietitian her patients chat with. Never anybody else's dietitian.
  if (hospital.kind === "dietitian") {
    const owner = staff[0];
    return owner ? [{ name: owner.name, role: "dietitian", whatsapp: whatsappNumber(owner.phone)! }] : [];
  }
  const pick = (role: StaffRole, chosen: string | null | undefined) =>
    staff.find((s) => s.role === role && s.user_id === chosen) ?? staff.find((s) => s.role === role);
  return [pick("dietitian", hospital.chat_dietitian_id), pick("doctor", hospital.chat_doctor_id)]
    .filter((s): s is StaffRow => !!s)
    .map((s) => ({ name: s.name, role: s.role, whatsapp: whatsappNumber(s.phone)! }));
}

/**
 * Give back the paid personal days a patient brought with them, once they are
 * no longer covered by the hospital (removed, or the hospital's access ended).
 *
 * When a paying member joins a hospital, the days left on their own plan are
 * written to `carried_ms`. Their own plan keeps its end date while the hospital
 * covers them, so on the way out their end becomes the later of what it is and
 * "now + the days they brought". `carried_restored_at` makes it happen once.
 */
export async function restoreCarried(admin: SupabaseClient, row: Pick<PatientRow, "id" | "user_id" | "carried_ms" | "carried_restored_at">): Promise<void> {
  if (!row.user_id || !row.carried_ms || row.carried_ms <= 0 || row.carried_restored_at) return;
  // Claim it first, so two calls at once cannot both give the days.
  const { data: claimed } = await admin
    .from("hospital_patients")
    .update({ carried_restored_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("carried_restored_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) return;
  const { data: sub } = await admin
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", row.user_id)
    .maybeSingle();
  if (!sub) return;
  const target = Date.now() + row.carried_ms;
  const current = sub.current_period_end ? new Date(sub.current_period_end as string).getTime() : 0;
  if (target <= current) return;
  await admin
    .from("subscriptions")
    .update({ current_period_end: new Date(target).toISOString(), status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", row.user_id);
}

export type PracticeRulesOut = { note: string | null; avoid: string[]; prefer: string[] };

/**
 * A dietitian's note and food rules for one patient row. Its own read, and
 * any failure (the columns not added yet) reads as "no rules", so coverage
 * itself never depends on this.
 */
export async function practiceRulesFor(admin: SupabaseClient, patientRowId: string): Promise<PracticeRulesOut | null> {
  try {
    const { data, error } = await admin
      .from("hospital_patients")
      .select("dietitian_note,avoid_food_ids,prefer_food_ids")
      .eq("id", patientRowId)
      .maybeSingle();
    if (error || !data) return null;
    const note = typeof data.dietitian_note === "string" && data.dietitian_note.trim() ? data.dietitian_note.trim() : null;
    const avoid = Array.isArray(data.avoid_food_ids) ? (data.avoid_food_ids as string[]) : [];
    const prefer = Array.isArray(data.prefer_food_ids) ? (data.prefer_food_ids as string[]) : [];
    return note || avoid.length || prefer.length ? { note, avoid, prefer } : null;
  } catch {
    return null;
  }
}

/** The patient's payment countdown (patient-paid-schema.sql). Any failure reads as none. */
export async function paidUntilFor(admin: SupabaseClient, patientRowId: string): Promise<string | null> {
  try {
    const { data, error } = await admin.from("hospital_patients").select("paid_until").eq("id", patientRowId).maybeSingle();
    if (error || !data) return null;
    return (data.paid_until as string | null) ?? null;
  } catch {
    return null;
  }
}

/** Days left on a person's own paid plan right now, in ms (0 when none). */
export async function ownPaidMsLeft(admin: SupabaseClient, uid: string): Promise<number> {
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", uid)
    .maybeSingle();
  if (!sub || !(sub.status === "active" || sub.status === "non-renewing") || !sub.current_period_end) return 0;
  return Math.max(0, new Date(sub.current_period_end as string).getTime() - Date.now());
}

/**
 * What the patient app needs to know about a person's hospital: covered or not,
 * by whom, until when, and who their Chat button reaches. Also returns the
 * hospitals they are staff at, so login can send a doctor to their dashboard.
 */
export async function hospitalStatusFor(admin: SupabaseClient, uid: string): Promise<{
  patient: null | {
    hospitalName: string;
    until: string;
    status: "active" | "waiting";
    chats: ChatPerson[];
    /** "dietitian" when a dietitian's practice covers them, so the app says "your dietitian". */
    kind: "hospital" | "dietitian";
    /** Her note and food rules for this patient (practice-rules-schema.sql), or null. */
    rules: PracticeRulesOut | null;
    /** When their payment to the dietitian or hospital runs out (patient-paid-schema.sql), or null. */
    paidUntil: string | null;
  };
  staff: { id: string; name: string; role: StaffRole; kind: "hospital" | "dietitian" }[];
}> {
  const out: Awaited<ReturnType<typeof hospitalStatusFor>> = { patient: null, staff: [] };
  const [{ data: pats, error }, { data: staff }] = await Promise.all([
    admin
      .from("hospital_patients")
      .select("id,user_id,status,carried_ms,carried_restored_at,joined_at,hospitals(*)")
      .eq("user_id", uid),
    admin.from("hospital_staff").select("role,hospitals(*)").eq("user_id", uid),
  ]);
  if (error) return out;

  for (const s of (staff ?? []) as unknown as { role: StaffRole; hospitals: { id: string; name: string; status: string; kind?: string | null } | null }[]) {
    if (s.hospitals && (s.hospitals.status === "pilot" || s.hospitals.status === "active" || s.hospitals.status === "ended"))
      out.staff.push({ id: s.hospitals.id, name: s.hospitals.name, role: s.role, kind: s.hospitals.kind === "dietitian" ? "dietitian" : "hospital" });
  }

  type Joined = PatientRow & { hospitals: HospitalRow | null };
  const rows = (pats ?? []) as unknown as Joined[];
  for (const r of rows) {
    const h = r.hospitals;
    const covered = r.status === "active" && h && hospitalLive(h);
    if (!covered) await restoreCarried(admin, r);
  }
  const live = rows
    .filter((r) => r.hospitals && hospitalLive(r.hospitals) && (r.status === "active" || r.status === "waiting"))
    // Covered first, then the newest.
    .sort((a, b) => (a.status === b.status ? (b.joined_at ?? "").localeCompare(a.joined_at ?? "") : a.status === "active" ? -1 : 1));
  const pick = live[0];
  if (pick && pick.hospitals) {
    out.patient = {
      hospitalName: pick.hospitals.name,
      until: pick.hospitals.access_until as string,
      status: pick.status as "active" | "waiting",
      chats: pick.status === "active" ? await chatContacts(admin, pick.hospitals) : [],
      kind: pick.hospitals.kind === "dietitian" ? "dietitian" : "hospital",
      rules: pick.status === "active" && pick.hospitals.kind === "dietitian" ? await practiceRulesFor(admin, pick.id) : null,
      paidUntil: pick.status === "active" ? await paidUntilFor(admin, pick.id) : null,
    };
  }
  return out;
}
