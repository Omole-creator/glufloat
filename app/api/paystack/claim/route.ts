import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

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
  if (!res.ok || !body?.status || body.data?.status !== "success") {
    return NextResponse.json({ ok: false, error: "not_paid" }, { status: 402 });
  }
  const tx = body.data;

  const admin = createAdminClient();

  // A reference already linked to a different account must not be re-used.
  const { data: existing } = await admin
    .from("payments")
    .select("user_id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing?.user_id && existing.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "already_claimed" }, { status: 409 });
  }

  await admin.from("payments").upsert(
    {
      user_id: user.id,
      email: (tx.customer?.email || user.email || "").toLowerCase(),
      reference,
      amount: tx.amount,
      status: "success",
      paid_at: tx.paid_at || new Date().toISOString(),
    },
    { onConflict: "reference" },
  );

  await admin.from("subscriptions").upsert(
    {
      user_id: user.id,
      status: "active",
      current_period_end: new Date(Date.now() + MONTH_MS).toISOString(),
      amount: tx.amount,
      paystack_customer_code: tx.customer?.customer_code ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return NextResponse.json({ ok: true });
}
