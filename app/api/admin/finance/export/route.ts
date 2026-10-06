import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { loadFinance } from "@/lib/financeData";
import { dayStart, paystackFee } from "@/lib/finance";
import { categoryOf, FOUNDERS, INCOME_LABEL, LOAN_KIND_LABEL, PAYER_LABEL } from "@/lib/financeConfig";
import { parsePeriod, type PeriodParams } from "@/lib/period";
import { TIER_LABEL, tierForAmount } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Every money entry in the period, as a CSV Excel opens: subscription payments
 * (with the estimated Paystack fee), partner commissions, expenses, other money
 * in and founder loan moves. Payments carry the plan, never the payer's name
 * or email: an accountant needs the money, not who has diabetes.
 */
export async function GET(request: Request) {
  const c = await cookies();
  if (!process.env.ADMIN_PASSWORD || c.get(ADMIN_COOKIE)?.value !== adminToken()) {
    return new Response("Not allowed", { status: 401 });
  }
  const sp = Object.fromEntries(new URL(request.url).searchParams) as PeriodParams;
  const period = parsePeriod(sp);
  const from = period.from?.getTime() ?? -Infinity;
  const to = period.to?.getTime() ?? Infinity;
  const inP = (t: number) => t >= from && t < to;
  const { input } = await loadFinance();

  const iso = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const n = (kobo: number) => (kobo / 100).toFixed(2);
  type Line = [string, string, string, string, string, string, string];
  const lines: Line[] = [];

  for (const p of input.payments.filter((p) => inP(p.at))) {
    lines.push([iso(p.at), "Money in", "Subscription", TIER_LABEL[tierForAmount(p.amount)], "Customer (Paystack)", n(p.amount), n(-paystackFee(p.amount))]);
  }
  for (const i of input.income.filter((i) => inP(dayStart(i.received_on)))) {
    lines.push([i.received_on, "Money in", INCOME_LABEL[i.kind], [i.source, i.note].filter(Boolean).join(" - "), "", n(i.amount), ""]);
  }
  for (const x of input.commissions.filter((x) => inP(x.at))) {
    lines.push([iso(x.at), "Money out", "Partner commission", "40% of a referred payment", "Partner", n(-x.amount), ""]);
  }
  for (const e of input.expenses.filter((e) => inP(dayStart(e.spent_on)))) {
    lines.push([
      e.spent_on,
      "Money out",
      categoryOf(e.category).label,
      [e.description, e.vendor ? `to ${e.vendor}` : ""].filter(Boolean).join(" "),
      PAYER_LABEL[e.paid_by],
      n(-e.amount),
      "",
    ]);
  }
  for (const l of input.loans.filter((l) => inP(dayStart(l.happened_on)))) {
    const f = FOUNDERS.find((x) => x.key === l.founder)!;
    lines.push([
      l.happened_on,
      l.kind === "cash_in" ? "Founder loan in" : "Founder loan repaid",
      LOAN_KIND_LABEL[l.kind],
      l.note ?? "",
      `${f.name} (${f.role})`,
      n(l.kind === "cash_in" ? l.amount : -l.amount),
      "",
    ]);
  }
  lines.sort((a, b) => a[0].localeCompare(b[0]));

  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [
    ["Date", "Type", "Category", "Description", "Paid by / from", "Amount (N)", "Paystack fee, estimated (N)"],
    ...lines,
  ]
    .map((r) => r.map(cell).join(","))
    .join("\r\n");

  const name = `glufloat-finance-${period.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  // The BOM makes Excel read the file as UTF-8.
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}
