import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { writeInvoiceSettings } from "@/lib/invoiceSettings";

export const dynamic = "force-dynamic";

/** Save the bank details and the VAT switch printed on hospital invoices. */
export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const sig = String(body.signature ?? "");
  // A PNG only, and small (a cropped signature is about 30KB).
  if (sig && (!sig.startsWith("data:image/png;base64,") || sig.length > 400_000))
    return NextResponse.json({ error: "The signature must be a PNG under 300KB." }, { status: 400 });
  const ok = await writeInvoiceSettings(createAdminClient(), {
    bankName: clip(body.bankName, 80),
    accountName: clip(body.accountName, 120),
    accountNumber: clip(body.accountNumber, 20).replace(/\s/g, ""),
    vatOn: body.vatOn === true,
    signature: sig,
    signName: clip(body.signName, 80),
    signTitle: clip(body.signTitle, 80),
  });
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Could not save. Has the hospitals SQL been run?" }, { status: 503 });
}
