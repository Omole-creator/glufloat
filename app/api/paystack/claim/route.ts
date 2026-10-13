import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { grantPayment } from "@/lib/paymentGrant";
import { practicePlanForAmount } from "@/lib/hospitalPlans";
import { grantPracticePayment } from "@/lib/practicePayment";

export const dynamic = "force-dynamic";

/**
 * Link a finished Paystack payment to the signed-in account, by reference.
 *
 * The webhook identifies a payer by the email Paystack reports. If the buyer
 * edits that email on the checkout page it matches no `profiles` row, the
 * subscription is never written, and they pay without gaining access.
 *
 * Paystack's callback sends them back to /unlock?reference=..., and the person
 * arriving there is the buyer, already signed in. So we trust the *session* for
 * identity and Paystack for the payment, and never the typed email. A reference
 * is unguessable and single-use here: one already linked to another account is
 * refused, so a leaked reference cannot move somebody else's payment.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }

  const { reference } = await request.json().catch(() => ({ reference: "" }));
  if (!reference || typeof reference !== "string") {
    return NextResponse.json({ ok: false, error: "no_reference" }, { status: 400 });
  }

  // Identity comes from the session cookie, never from the request body.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" }, { status: 401 });
  }

  // Ask Paystack whether this reference really was paid.
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
  );
  const body = await res.json().catch(() => null);
  const status: string = body?.data?.status ?? "";

  // Paystack does not know this reference. Invented or mistyped: refuse it, and
  // keep refusing. Only a reference Paystack has seen can be worth retrying.
  if (!res.ok || !body?.status) {
    return NextResponse.json({ ok: false, error: "not_paid" }, { status: 402 });
  }

  if (status !== "success") {
    /**
     * Card is instant, so anything other than "success" used to mean "not paid".
     * Transfer and USSD are not. A transfer the buyer has begun but the bank has
     * not settled verifies as "abandoned" (Paystack's transaction statuses are
     * only success / failed / abandoned, with no "pending"). So only an outright
     * "failed" is final. Anything else means "ask again in a moment", and the
     * caller keeps retrying. Calling a settling transfer `not_paid` is exactly
     * what would lock a paying customer out of the app they just bought.
     */
    const finalFailure = status === "failed";
    return NextResponse.json(
      { ok: false, error: finalFailure ? "not_paid" : "pending", status },
      { status: finalFailure ? 402 : 202 },
    );
  }
  const tx = body.data;

  const admin = createAdminClient();

  // A dietitian paying for her practice (GluFloat for dietitians). Never
  // treated as a patient's own subscription (lib/practicePayment.ts).
  if (practicePlanForAmount(tx.amount)) {
    const r = await grantPracticePayment(admin, {
      uid: user.id,
      reference,
      amount: tx.amount,
      paidAt: tx.paid_at || new Date().toISOString(),
    });
    if (r === "conflict") return NextResponse.json({ ok: false, error: "already_claimed" }, { status: 409 });
    if (r === "no_practice") return NextResponse.json({ ok: false, error: "no_practice", practice: true }, { status: 409 });
    return NextResponse.json({ ok: true, practice: true });
  }

  // A reference already linked to a different account must not be re-used.
  const { data: existing } = await admin
    .from("payments")
    .select("user_id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing?.user_id && existing.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "already_claimed" }, { status: 409 });
  }

  // One grant per payment, with paid days adding up (lib/paymentGrant.ts).
  const result = await grantPayment(admin, {
    uid: user.id,
    reference,
    amount: tx.amount,
    email: (tx.customer?.email || user.email || "").toLowerCase(),
    paidAt: tx.paid_at || new Date().toISOString(),
    customerCode: tx.customer?.customer_code ?? null,
  });
  if (result === "conflict") {
    return NextResponse.json({ ok: false, error: "already_claimed" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
