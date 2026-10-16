import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { listBanks, resolveAccount } from "@/lib/paystackBanks";

export const dynamic = "force-dynamic";

/**
 * A field agent's or advisor's bank account, typed in by GluFloat admin only
 * (their dashboard is a link with no login, so it can never change where the
 * money goes). Paystack reads the name on the account before it is saved.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.agentId ?? "");
  const bankCode = String(body.bankCode ?? "").trim();
  const accountNumber = String(body.accountNumber ?? "").replace(/\D/g, "");
  const bank = (await listBanks()).find((b) => b.code === bankCode);
  if (!bank) return NextResponse.json({ error: "Please choose the bank." }, { status: 400 });
  const r = await resolveAccount(accountNumber, bankCode);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  const { error } = await createAdminClient()
    .from("field_agents")
    .update({
      bank_name: bank.name,
      bank_code: bank.code,
      account_number: accountNumber,
      account_name: r.name,
      recipient_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "This did not save." }, { status: 503 });
  return NextResponse.json({ ok: true, accountName: r.name });
}
