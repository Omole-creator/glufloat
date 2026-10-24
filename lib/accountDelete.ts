import type { SupabaseClient } from "@supabase/supabase-js";
import { isInternalEmail } from "./internalAccounts";
import { earningTotals, type EarningRow, type PayoutRow } from "./careFeesServer";
import { restoreCarried } from "./hospitalServer";
import { removeContact } from "./mailyte";

/**
 * A person deleting their own GluFloat account (founder, 2026-10-24). Any
 * kind of user: a member, a hospital or dietitian patient, hospital staff, a
 * dietitian or a doctor. The founder's four rules:
 *
 *  1. Everything about the person goes, for good: login, profile, meals,
 *     sugar tests, HbA1c, weights, chats, reminders, referral rows (all of
 *     these cascade from auth.users, see supabase/*.sql).
 *  2. Money records stay, without their name or email: `payments` keeps the
 *     amount and date (user_id is set null by the database; the email is
 *     blanked here), `patient_payments`, `clinician_earnings` and
 *     `earning_payouts` keep theirs (they hold no name), and a practice's
 *     name is taken off `finance_income`.
 *  3. Straight away, no undo. The page asks them to type DELETE.
 *  4. A dietitian or doctor GluFloat still owes money cannot delete until
 *     paid. Their practice closes and each patient keeps their own account,
 *     with any paid days they brought given back (restoreCarried). The
 *     practice row is emptied and switched off, not erased, so its payout
 *     records stay valid (it shows in admin as "A deleted account").
 *
 * Paid days left on their own plan are lost and not refunded; the page says
 * so first. Our own test and team accounts (isInternalEmail) are refused, so
 * the QA suite and the demos cannot be deleted by accident.
 */

export interface DeletePreview {
  internal: boolean;
  /** Whole days left on their own GluFloat plan or their dietitian's programme. */
  paidDaysLeft: number;
  /** Practices (dietitian or doctor) this person runs. */
  practices: { id: string; name: string; kind: string }[];
  /** Kobo GluFloat still owes them (blocks deletion when above 0). */
  owedKobo: number;
}

const DAY = 24 * 60 * 60 * 1000;

async function ownPractices(admin: SupabaseClient, uid: string) {
  const { data } = await admin
    .from("hospital_staff")
    .select("role,hospitals(id,name,kind)")
    .eq("user_id", uid)
    .eq("role", "admin");
  const out: { id: string; name: string; kind: string }[] = [];
  type H = { id: string; name: string; kind: string | null };
  for (const r of (data ?? []) as unknown as { hospitals: H | H[] | null }[]) {
    const h = Array.isArray(r.hospitals) ? r.hospitals[0] : r.hospitals;
    if (h && (h.kind === "dietitian" || h.kind === "doctor")) out.push({ id: h.id, name: h.name, kind: h.kind });
  }
  return out;
}

export async function previewDelete(admin: SupabaseClient, uid: string, email: string | null): Promise<DeletePreview> {
  const now = Date.now();
  const [sub, pats, practices] = await Promise.all([
    admin.from("subscriptions").select("current_period_end").eq("user_id", uid).maybeSingle(),
    admin.from("hospital_patients").select("paid_until").eq("user_id", uid),
    ownPractices(admin, uid),
  ]);
  let until = 0;
  const end = (sub.data as { current_period_end?: string } | null)?.current_period_end;
  if (end) until = Math.max(until, Date.parse(end));
  for (const p of (pats.data ?? []) as { paid_until: string | null }[]) {
    if (p.paid_until) until = Math.max(until, Date.parse(p.paid_until));
  }
  // A plan that runs past the year 2900 is a never-ending team or demo plan.
  const paidDaysLeft = until > now && until < Date.UTC(2900, 0, 1) ? Math.ceil((until - now) / DAY) : 0;

  let owedKobo = 0;
  if (practices.length > 0) {
    const ids = practices.map((p) => p.id);
    const [earn, pay] = await Promise.all([
      admin.from("clinician_earnings").select("*").in("hospital_id", ids),
      admin.from("earning_payouts").select("*").in("hospital_id", ids),
    ]);
    owedKobo = earningTotals((earn.data ?? []) as EarningRow[], (pay.data ?? []) as PayoutRow[]).owed;
  }
  return { internal: isInternalEmail(email), paidDaysLeft, practices, owedKobo };
}

export type DeleteResult = { ok: true } | { ok: false; status: number; error: string };

export async function deleteOwnAccount(admin: SupabaseClient, uid: string, email: string | null): Promise<DeleteResult> {
  const pre = await previewDelete(admin, uid, email);
  if (pre.internal) return { ok: false, status: 403, error: "This is a GluFloat team or test account. It cannot be deleted here." };
  if (pre.owedKobo > 0) {
    return { ok: false, status: 409, error: "GluFloat still owes you money. Message us so we can pay you first." };
  }

  // Their practices close: patients keep their accounts and get back any paid
  // days they brought, and the practice's name comes off the income records.
  for (const p of pre.practices) {
    const { data: rows } = await admin
      .from("hospital_patients")
      .select("id,user_id,carried_ms,carried_restored_at")
      .eq("hospital_id", p.id);
    for (const r of rows ?? []) await restoreCarried(admin, r as Parameters<typeof restoreCarried>[1]);
    for (const source of [`Dietitian: ${p.name}`, `Dietitian patient: ${p.name}`]) {
      await admin.from("finance_income").update({ source: "A deleted account" }).eq("source", source);
    }
    // Patients come off the list, keeping their own accounts.
    await admin.from("hospital_patients").delete().eq("hospital_id", p.id);
    await admin.from("hospital_invites").delete().eq("hospital_id", p.id);
    // The practice row is closed and emptied of every personal detail, not
    // erased: a payout must point at a practice or a rep (earning_payouts'
    // check), so erasing a practice that was ever paid is refused by the
    // database. The money records stay attached to an empty, closed practice.
    const { error } = await admin
      .from("hospitals")
      .update({
        name: "A deleted account",
        status: "declined",
        contact_name: null,
        contact_role: null,
        contact_phone: null,
        contact_email: null,
        city: null,
        state: null,
        message: null,
        dcn_number: null,
        mdcn_number: null,
        bank_name: null,
        bank_code: null,
        account_number: null,
        account_name: null,
        recipient_code: null,
        chat_user_id: null,
      })
      .eq("id", p.id);
    if (error) return { ok: false, status: 503, error: "Could not delete your account. Please try again." };
  }

  // Their place on any hospital's or dietitian's patient list goes too: the
  // name and phone there are theirs.
  await admin.from("hospital_patients").delete().eq("user_id", uid);

  // Messages they wrote to patients stay in the patient's chat, unnamed.
  await admin.from("chat_messages").update({ sender_name: "Former care team member" }).eq("sender_id", uid).neq("sender_role", "patient");

  // Payments stay for the accounts, without their email.
  await admin.from("payments").update({ email: null }).eq("user_id", uid);
  // Same address in any case; % and _ are escaped so ilike matches it exactly.
  if (email) await admin.from("payments").update({ email: null }).ilike("email", email.replace(/[%_\\]/g, "\\$&"));

  if (email) await removeContact(email);

  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return { ok: false, status: 503, error: "Could not delete your account. Please try again." };
  return { ok: true };
}
