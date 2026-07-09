import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Paystack webhook. Verifies the signature, then updates the paying user's
 * subscription + payment log. This is what ties a payment to an account
 * (killing link-sharing) and powers the churn / MRR numbers.
 *
 * Set your Paystack webhook URL to https://glufloat.com/api/paystack/webhook.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 });

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const hash = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (hash !== signature) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const type: string = event.event;
  const data = event.data || {};
  const email: string = (data.customer?.email || "").toLowerCase();
  const admin = createAdminClient();

  /**
   * Who paid. `metadata.user_id` is authoritative when present, because it was
   * set by us rather than typed by the buyer. Email is only a fallback, and a
   * weak one: a buyer who edits their email on the checkout page matches no
   * profile, so nothing is written and they pay without gaining access. The
   * /unlock callback covers that case by claiming the reference against the
   * signed-in session (see app/api/paystack/claim/route.ts).
   */
  async function payerUserId(): Promise<string | null> {
    const fromMeta = data.metadata?.user_id;
    if (typeof fromMeta === "string" && fromMeta) return fromMeta;
    if (!email) return null;
    const { data: p } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    return p?.id ?? null;
  }

  if (type === "charge.success") {
    const uid = await payerUserId();
    await admin.from("payments").upsert(
      {
        user_id: uid,
        email,
        reference: data.reference,
        amount: data.amount,
        status: "success",
        paid_at: data.paid_at || new Date().toISOString(),
      },
      { onConflict: "reference" },
    );
    if (uid) {
      await admin.from("subscriptions").upsert(
        {
          user_id: uid,
          status: "active",
          current_period_end: new Date(Date.now() + MONTH_MS).toISOString(),
          amount: data.amount,
          paystack_customer_code: data.customer?.customer_code ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  } else if (type === "subscription.create") {
    const uid = await payerUserId();
    if (uid) {
      await admin.from("subscriptions").upsert(
        {
          user_id: uid,
          status: "active",
          current_period_end:
            data.next_payment_date || new Date(Date.now() + MONTH_MS).toISOString(),
          amount: data.amount ?? null,
          paystack_customer_code: data.customer?.customer_code ?? null,
          paystack_sub_code: data.subscription_code ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  } else if (type === "subscription.disable" || type === "subscription.not_renew") {
    const uid = await payerUserId();
    if (uid) {
      // Keep access until the paid period ends; just stop it renewing.
      await admin
        .from("subscriptions")
        .update({ status: "non-renewing", updated_at: new Date().toISOString() })
        .eq("user_id", uid);
    }
  }

  return NextResponse.json({ ok: true });
}
