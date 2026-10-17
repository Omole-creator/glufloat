import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { startPatientPayment } from "@/lib/patientPaysServer";

export const dynamic = "force-dynamic";

/**
 * A dietitian's patient taps "Pay": start a Paystack payment for one month at
 * her price (lib/patientPaysServer.ts). Identity is the session; the price
 * and the dietitian come from the database, never from the browser. Answers
 * { url } to send them to Paystack's checkout.
 */
export async function POST() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const r = await startPatientPayment(createAdminClient(), user.id, user.email);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ url: r.url });
}
