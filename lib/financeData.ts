import { createAdminClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/adminFetch";
import { isInternalEmail } from "@/lib/internalAccounts";
import type { ExpenseRow, IncomeRow, LoanMoveRow } from "@/lib/financeConfig";
import type { FinanceInput } from "@/lib/finance";

/**
 * Everything the finance screens need, read once, with our own test and demo
 * accounts left out exactly as on the dashboard.
 *
 * `ready` is false until supabase/finance-schema.sql has been run. The money
 * that comes from Paystack still shows; the typed-in ledgers read as empty and
 * the forms stay off, rather than the page breaking.
 */
export async function loadFinance(): Promise<{ input: FinanceInput; ready: boolean }> {
  const admin = createAdminClient();
  const [profiles, subs, payments, commissions, payouts, expenses, income, loans] = await Promise.all([
    fetchAll<{ id: string; email: string }>(() => admin.from("profiles").select("id,email")),
    fetchAll<{ user_id: string; status: string; current_period_end: string | null; amount: number | null }>(
      () => admin.from("subscriptions").select("user_id,status,current_period_end,amount"),
    ),
    fetchAll<{ user_id: string | null; email: string | null; amount: number; status: string; paid_at: string | null }>(
      () => admin.from("payments").select("user_id,email,amount,status,paid_at"),
    ),
    fetchAll<{ user_id: string | null; amount: number; earned_at: string }>(() =>
      admin.from("commissions").select("user_id,amount,earned_at"),
    ),
    fetchAll<{ amount: number; paid_at: string }>(() => admin.from("payouts").select("amount,paid_at")),
    fetchAll<ExpenseRow>(() =>
      admin
        .from("finance_expenses")
        .select("id,spent_on,amount,category,description,vendor,paid_by")
        .order("spent_on", { ascending: false }),
    ),
    fetchAll<IncomeRow>(() =>
      admin
        .from("finance_income")
        .select("id,received_on,amount,kind,source,note")
        .order("received_on", { ascending: false }),
    ),
    fetchAll<LoanMoveRow>(() =>
      admin
        .from("founder_loan_moves")
        .select("id,founder,kind,happened_on,amount,note")
        .order("happened_on", { ascending: false }),
    ),
  ]);

  const internal = new Set(profiles.rows.filter((p) => isInternalEmail(p.email)).map((p) => p.id));
  const real = (uid: string | null | undefined) => !uid || !internal.has(uid);

  const input: FinanceInput = {
    payments: payments.rows
      .filter((p) => p.status === "success" && p.paid_at && real(p.user_id) && !isInternalEmail(p.email))
      .map((p) => ({
        at: new Date(p.paid_at as string).getTime(),
        amount: p.amount || 0,
        payer: p.user_id ?? (p.email ?? "").toLowerCase(),
      })),
    subs: subs.rows
      .filter((s) => real(s.user_id))
      .map((s) => ({
        status: s.status,
        end: s.current_period_end ? new Date(s.current_period_end).getTime() : null,
        amount: s.amount,
      })),
    commissions: commissions.rows
      .filter((c) => real(c.user_id))
      .map((c) => ({ at: new Date(c.earned_at).getTime(), amount: c.amount })),
    payouts: payouts.rows.map((p) => ({ at: new Date(p.paid_at).getTime(), amount: p.amount })),
    expenses: expenses.rows,
    income: income.rows,
    loans: loans.rows,
    now: Date.now(),
  };
  return { input, ready: expenses.ok && income.ok && loans.ok };
}
