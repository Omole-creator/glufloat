/**
 * The vocabulary of /admin/finance: expense categories, who can pay, kinds of
 * money in, and the form fields for each ledger. No "use client" and no
 * functions in the configs, so the server pages and the client forms read the
 * same lists.
 *
 * Every amount is KOBO, like `payments.amount`. The forms take naira and the
 * route turns it into kobo.
 */

/** Where an expense sits in the P&L. */
export type CostKind = "cost_of_revenue" | "operating";

export const EXPENSE_CATEGORIES: {
  key: string;
  label: string;
  kind: CostKind;
  /** Counts toward the cost of winning a customer (CAC). */
  acquisition?: boolean;
}[] = [
  { key: "hosting", label: "Hosting and servers", kind: "cost_of_revenue" },
  { key: "dietitians", label: "Dietitian pay", kind: "cost_of_revenue" },
  { key: "bank_charges", label: "Bank charges", kind: "cost_of_revenue" },
  { key: "marketing", label: "Marketing and ads", kind: "operating", acquisition: true },
  { key: "salaries", label: "Salaries and contractors", kind: "operating" },
  { key: "software", label: "Software and tools", kind: "operating" },
  { key: "research", label: "Research and food review", kind: "operating" },
  { key: "legal", label: "Legal, registration and tax", kind: "operating" },
  { key: "equipment", label: "Phones, laptops and equipment", kind: "operating" },
  { key: "data", label: "Internet, data and airtime", kind: "operating" },
  { key: "transport", label: "Transport and travel", kind: "operating" },
  { key: "office", label: "Office and rent", kind: "operating" },
  { key: "other", label: "Other", kind: "operating" },
];

export const categoryOf = (key: string) =>
  EXPENSE_CATEGORIES.find((c) => c.key === key) ??
  EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

export type Payer = "company" | "omole" | "favour";
export type Founder = "omole" | "favour";

export const FOUNDERS: { key: Founder; name: string; role: string }[] = [
  { key: "omole", name: "Omole", role: "Founder A" },
  { key: "favour", name: "Favour", role: "Founder B" },
];

export const PAYER_LABEL: Record<Payer, string> = {
  company: "GluFloat account",
  omole: "Omole (Founder A)",
  favour: "Favour (Founder B)",
};

export type IncomeKind = "other_revenue" | "grant" | "investment";

/** Only `other_revenue` is revenue. A grant or an investment is cash, never sales. */
export const INCOME_LABEL: Record<IncomeKind, string> = {
  other_revenue: "Other sales (counts as revenue)",
  grant: "Grant",
  investment: "Investment",
};

export type LoanKind = "cash_in" | "repaid";

export const LOAN_KIND_LABEL: Record<LoanKind, string> = {
  cash_in: "Put cash into GluFloat",
  repaid: "GluFloat paid back",
};

// ---- Rows as they come back from the database --------------------------------

export type ExpenseRow = {
  id: string;
  spent_on: string;
  amount: number;
  category: string;
  description: string;
  vendor: string | null;
  paid_by: Payer;
};

export type IncomeRow = {
  id: string;
  received_on: string;
  amount: number;
  kind: IncomeKind;
  source: string;
  note: string | null;
};

export type LoanMoveRow = {
  id: string;
  founder: Founder;
  kind: LoanKind;
  happened_on: string;
  amount: number;
  note: string | null;
};

// ---- The forms --------------------------------------------------------------

export type LedgerTable = "expense" | "income" | "loan";

export type Field = {
  name: string;
  label: string;
  type: "date" | "amount" | "select" | "text";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  /** Spans the whole row of the form grid. */
  wide?: boolean;
};

export const FIELDS: Record<LedgerTable, Field[]> = {
  expense: [
    { name: "spent_on", label: "Date", type: "date", required: true },
    { name: "amount", label: "Amount (N)", type: "amount", required: true, placeholder: "25000" },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: EXPENSE_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
    },
    {
      name: "paid_by",
      label: "Who paid",
      type: "select",
      required: true,
      options: (Object.keys(PAYER_LABEL) as Payer[]).map((k) => ({ value: k, label: PAYER_LABEL[k] })),
    },
    {
      name: "description",
      label: "What it was spent on",
      type: "text",
      required: true,
      wide: true,
      placeholder: "Vercel Pro plan for October",
    },
    { name: "vendor", label: "Paid to (optional)", type: "text", wide: true, placeholder: "Vercel" },
  ],
  income: [
    { name: "received_on", label: "Date", type: "date", required: true },
    { name: "amount", label: "Amount (N)", type: "amount", required: true, placeholder: "500000" },
    {
      name: "kind",
      label: "What kind",
      type: "select",
      required: true,
      wide: true,
      options: (Object.keys(INCOME_LABEL) as IncomeKind[]).map((k) => ({ value: k, label: INCOME_LABEL[k] })),
    },
    { name: "source", label: "From whom", type: "text", required: true, wide: true, placeholder: "Tony Elumelu Foundation" },
    { name: "note", label: "Note (optional)", type: "text", wide: true },
  ],
  loan: [
    { name: "happened_on", label: "Date", type: "date", required: true },
    { name: "amount", label: "Amount (N)", type: "amount", required: true, placeholder: "100000" },
    {
      name: "founder",
      label: "Founder",
      type: "select",
      required: true,
      options: FOUNDERS.map((f) => ({ value: f.key, label: `${f.name} (${f.role})` })),
    },
    {
      name: "kind",
      label: "What happened",
      type: "select",
      required: true,
      options: (Object.keys(LOAN_KIND_LABEL) as LoanKind[]).map((k) => ({ value: k, label: LOAN_KIND_LABEL[k] })),
    },
    { name: "note", label: "Note (optional)", type: "text", wide: true, placeholder: "Transferred to the company account" },
  ],
};

/** Which date column each ledger is sorted and filtered by. */
export const DATE_FIELD: Record<LedgerTable, string> = {
  expense: "spent_on",
  income: "received_on",
  loan: "happened_on",
};

export const TABLE_NAME: Record<LedgerTable, string> = {
  expense: "finance_expenses",
  income: "finance_income",
  loan: "founder_loan_moves",
};

/** "N25,000" from kobo. Keeps kobo when there are any, so a N22.50 fee is not N23. */
export function naira(kobo: number): string {
  const sign = kobo < 0 ? "-" : "";
  const n = Math.abs(kobo) / 100;
  const whole = Number.isInteger(n);
  return (
    sign +
    "N" +
    n.toLocaleString("en-NG", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })
  );
}

/** Headline numbers: rounded to the whole naira. Statements keep every kobo. */
export function nairaWhole(kobo: number): string {
  return naira(Math.sign(kobo) * Math.round(Math.abs(kobo) / 100) * 100);
}

/** "N1.2m", "N350k": for chart labels where the full number does not fit. */
export function nairaShort(kobo: number): string {
  const n = Math.abs(kobo) / 100;
  const sign = kobo < 0 ? "-" : "";
  if (n >= 1_000_000) return `${sign}N${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}m`;
  if (n >= 1_000) return `${sign}N${Math.round(n / 1_000)}k`;
  return `${sign}N${Math.round(n)}`;
}
