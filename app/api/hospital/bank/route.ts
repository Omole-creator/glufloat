import { NextResponse } from "next/server";
import { staffContext } from "@/lib/hospitalServer";
import { isDoctorPractice } from "@/lib/hospitalPlans";
import { listBanks, resolveAccount } from "@/lib/paystackBanks";
import { isPatientPays } from "@/lib/patientPays";

export const dynamic = "force-dynamic";

/**
 * A GluFloat doctor saves the bank account their care fees are paid to, or a
 * dietitian the account her patients' payments are paid to
 * (patient-pays-schema.sql). Only the person who runs the practice. Paystack reads the name on the
 * account before it is saved.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(typeof body.hid === "string" ? body.hid : null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!(isDoctorPractice(ctx.hospital) || isPatientPays(ctx.hospital)) || ctx.staff.role !== "admin")
    return NextResponse.json({ error: "Only the owner of this practice can change this." }, { status: 403 });

  const bankCode = String(body.bankCode ?? "").trim();
  const accountNumber = String(body.accountNumber ?? "").replace(/\D/g, "");
  const bank = (await listBanks()).find((b) => b.code === bankCode);
  if (!bank) return NextResponse.json({ error: "Please choose your bank." }, { status: 400 });
  const r = await resolveAccount(accountNumber, bankCode);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  const { error } = await ctx.admin
    .from("hospitals")
    .update({
      bank_name: bank.name,
      bank_code: bank.code,
      account_number: accountNumber,
      account_name: r.name,
      recipient_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.hospital.id);
  if (error) return NextResponse.json({ error: "This is not ready yet. Please try again later." }, { status: 503 });
  return NextResponse.json({ ok: true, accountName: r.name });
}
