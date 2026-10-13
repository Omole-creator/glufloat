/**
 * Turn ONE successful Paystack payment from a dietitian into a month on her
 * practice's plan, exactly once (GluFloat for dietitians, 2026-10-13).
 *
 * Shared by /api/paystack/claim and /api/paystack/webhook, which both see the
 * same payment. They send a payment here INSTEAD of lib/paymentGrant.ts when
 * its amount is a dietitian plan's amount (practicePlanForAmount). It must
 * never reach paymentGrant: that would write `payments` and `subscriptions`,
 * turning a dietitian's ₦12,000 into a patient's own Basic plan, and would
 * fire the partner commission trigger and the invite-a-friend reward.
 *
 * The lock is `practice_payments.reference` (primary key), inserted with
 * ignoreDuplicates, the same shape as paymentGrant: exactly one caller
 * extends the plan.
 *
 * A new month starts from the later of now and her current end, so days she
 * has left (free days included) are kept, the same rule as a hospital that
 * pays early (lib/hospitalPlans.ts extendAccess).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { extendAccess, practiceMonthsForAmount, practicePlanForAmount } from "@/lib/hospitalPlans";

export type PracticeGrantResult = "granted" | "already" | "conflict" | "no_practice" | "not_practice_amount";

export async function grantPracticePayment(
  admin: SupabaseClient,
  p: { uid: string | null; reference: string; amount: number; paidAt: string },
): Promise<PracticeGrantResult> {
  const plan = practicePlanForAmount(p.amount);
  if (!plan) return "not_practice_amount";
  if (!p.uid) return "no_practice";

  // Her practice: she is its admin, and it is a dietitian's practice.
  const { data: rows } = await admin
    .from("hospital_staff")
    .select("role,hospitals(*)")
    .eq("user_id", p.uid)
    .eq("role", "admin");
  const practice = ((rows ?? []) as unknown as { hospitals: Record<string, unknown> | null }[])
    .map((r) => r.hospitals)
    .find((h) => h && h.kind === "dietitian" && h.status !== "declined") as
    | { id: string; name: string; access_until: string | null }
    | undefined;

  const { data: inserted, error } = await admin
    .from("practice_payments")
    .upsert(
      {
        reference: p.reference,
        hospital_id: practice?.id ?? null,
        user_id: p.uid,
        amount: p.amount,
        plan: plan.id,
        paid_at: p.paidAt,
      },
      { onConflict: "reference", ignoreDuplicates: true },
    )
    .select("reference");
  // No table (the SQL has not run) means no dietitian practice can exist yet.
  if (error) return "no_practice";
  if (!inserted || inserted.length === 0) {
    const { data: existing } = await admin.from("practice_payments").select("user_id").eq("reference", p.reference).maybeSingle();
    return existing?.user_id && existing.user_id !== p.uid ? "conflict" : "already";
  }
  // Kept with no practice, so GluFloat can see a payment that found nobody.
  if (!practice) return "no_practice";

  // 1 month, or 12 for a yearly amount (12 months for the price of 10).
  const months = practiceMonthsForAmount(p.amount);
  const until = extendAccess(practice.access_until, months);
  await admin
    .from("hospitals")
    .update({
      plan: plan.id,
      seats: plan.seats,
      status: "active",
      billing: months === 12 ? "annual" : "monthly",
      access_until: until.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", practice.id);

  // Counted on /admin/finance, the same way a paid hospital invoice is.
  await admin.from("finance_income").insert({
    received_on: p.paidAt.slice(0, 10),
    amount: p.amount,
    kind: "other_revenue",
    source: `Dietitian: ${practice.name}`,
    note: `${plan.name}, ${months === 12 ? "12 months" : "1 month"}, Paystack ${p.reference}`,
  });

  return "granted";
}
