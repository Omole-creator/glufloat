import type { SupabaseClient } from "@supabase/supabase-js";
import { isInternalEmail } from "@/lib/internalAccounts";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { isUserType } from "@/lib/userType";

/**
 * Who goes on which email list (founder, 2026-10-13). The ONE place this is
 * worked out: the email page's counts, the CSV download and the sync before
 * every real send all read it, so they can never disagree.
 *
 * Direct users stay on the lists for who they said they are (Diabetic,
 * Health professional, Caregiver, Not set). Four groups are taken OFF those
 * lists and kept on their own, so an email to direct users never reaches them:
 *   - Dietitians       run a practice on GluFloat for dietitians
 *   - Hospital staff   a hospital's admin, doctor or dietitian
 *   - Dietitian patients / Hospital patients   a practice or a hospital
 *                      covers them right now (active or waiting)
 * Staff win over patient (a dietitian who is also somebody's patient is a
 * dietitian here), and a dietitian practice wins over a hospital.
 * Test accounts and phone-only patients (no real mailbox) are left out.
 */
export const AUDIENCES = [
  { key: "diabetic", label: "Diabetic" },
  { key: "health_pro", label: "Health professional" },
  { key: "caregiver", label: "Caregiver" },
  { key: "unset", label: "Not set" },
  { key: "dietitians", label: "Dietitians" },
  { key: "hospital_staff", label: "Hospital staff" },
  { key: "dietitian_patients", label: "Dietitian patients" },
  { key: "hospital_patients", label: "Hospital patients" },
] as const;

export type AudienceKey = (typeof AUDIENCES)[number]["key"];

export function isAudienceKey(k: string): k is AudienceKey {
  return AUDIENCES.some((a) => a.key === k);
}

export type AudienceRow = { email: string; name: string | null; key: AudienceKey; userType: string | null };

type Org = { kind?: string | null; status?: string | null } | null;
const open = (h: Org) => !!h && h.status !== "declined" && h.status !== "requested" && h.status !== "ended";

export async function emailAudience(admin: SupabaseClient): Promise<AudienceRow[]> {
  const [profs, staff, pats] = await Promise.all([
    admin.from("profiles").select("id,email,name,user_type"),
    admin.from("hospital_staff").select("user_id,hospitals(kind,status)"),
    admin.from("hospital_patients").select("user_id,hospitals(kind,status)").in("status", ["active", "waiting"]),
  ]);
  if (profs.error) throw new Error("Could not read the users.");

  // Missing hospital tables just mean nobody is in the four new groups.
  const role = new Map<string, AudienceKey>();
  for (const p of (pats.data ?? []) as unknown as { user_id: string | null; hospitals: Org }[]) {
    if (!p.user_id || !open(p.hospitals)) continue;
    if (p.hospitals?.kind === "dietitian") role.set(p.user_id, "dietitian_patients");
    else if (role.get(p.user_id) !== "dietitian_patients") role.set(p.user_id, "hospital_patients");
  }
  for (const s of (staff.data ?? []) as unknown as { user_id: string; hospitals: Org }[]) {
    if (!open(s.hospitals)) continue;
    if (s.hospitals?.kind === "dietitian") role.set(s.user_id, "dietitians");
    else if (role.get(s.user_id) !== "dietitians") role.set(s.user_id, "hospital_staff");
  }

  const out: AudienceRow[] = [];
  for (const p of profs.data ?? []) {
    const email = String(p.email ?? "").trim().toLowerCase();
    if (!email || isInternalEmail(email) || isPhoneLoginEmail(email)) continue;
    const t = (p.user_type as string | null) ?? null;
    out.push({
      email,
      name: (p.name as string | null) ?? null,
      key: role.get(p.id as string) ?? (t && isUserType(t) ? t : "unset"),
      userType: t,
    });
  }
  return out;
}
