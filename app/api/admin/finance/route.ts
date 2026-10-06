import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  EXPENSE_CATEGORIES,
  FIELDS,
  INCOME_LABEL,
  LOAN_KIND_LABEL,
  PAYER_LABEL,
  TABLE_NAME,
  type LedgerTable,
} from "@/lib/financeConfig";

export const dynamic = "force-dynamic";

/**
 * Add, change or delete one entry in a finance ledger: an expense, other money
 * in, or a founder loan move. Admin cookie first, then the service role, the
 * same as every other admin write. The browser never touches these tables.
 *
 * Body: { table, row } to add, { table, id, row } to change, { table, id } to
 * delete. Amounts arrive in naira (as typed) and are stored in kobo.
 */

const TABLES: LedgerTable[] = ["expense", "income", "loan"];
const ALLOWED: Record<string, string[]> = {
  category: EXPENSE_CATEGORIES.map((c) => c.key),
  paid_by: Object.keys(PAYER_LABEL),
  founder: ["omole", "favour"],
};
const KIND_ALLOWED: Record<LedgerTable, string[]> = {
  expense: [],
  income: Object.keys(INCOME_LABEL),
  loan: Object.keys(LOAN_KIND_LABEL),
};

async function authed() {
  const c = await cookies();
  return !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
}

/** Check every field against the form's own definition. Returns the row or an error. */
function clean(table: LedgerTable, raw: Record<string, unknown>): { row?: Record<string, unknown>; error?: string } {
  const row: Record<string, unknown> = {};
  for (const f of FIELDS[table]) {
    const v = String(raw[f.name] ?? "").trim();
    if (!v) {
      if (f.required) return { error: `${f.label} is missing.` };
      row[f.name] = null;
      continue;
    }
    if (f.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(new Date(v + "T00:00:00").getTime())) {
        return { error: "That date is not a real date." };
      }
      row[f.name] = v;
    } else if (f.type === "amount") {
      const n = Number(v.replace(/[,\sN₦]/gi, ""));
      if (!Number.isFinite(n) || n <= 0) return { error: "The amount must be a number above 0." };
      if (n > 10_000_000_000) return { error: "That amount is too large. Check the zeros." };
      row[f.name] = Math.round(n * 100);
    } else if (f.type === "select") {
      const allowed = f.name === "kind" ? KIND_ALLOWED[table] : ALLOWED[f.name];
      if (!allowed?.includes(v)) return { error: `${f.label} is not one of the choices.` };
      row[f.name] = v;
    } else {
      row[f.name] = v.slice(0, 500);
    }
  }
  return { row };
}

export async function POST(request: Request) {
  if (!(await authed())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const table = body.table as LedgerTable;
  if (!TABLES.includes(table)) return NextResponse.json({ error: "Unknown ledger." }, { status: 400 });
  const { row, error } = clean(table, body.row ?? {});
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { data, error: e } = await createAdminClient().from(TABLE_NAME[table]).insert(row!).select().single();
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: Request) {
  if (!(await authed())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const table = body.table as LedgerTable;
  if (!TABLES.includes(table) || !body.id) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }
  const { row, error } = clean(table, body.row ?? {});
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { error: e } = await createAdminClient()
    .from(TABLE_NAME[table])
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", String(body.id));
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await authed())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const table = body.table as LedgerTable;
  if (!TABLES.includes(table) || !body.id) {
    return NextResponse.json({ error: "Nothing to delete." }, { status: 400 });
  }
  const { error } = await createAdminClient().from(TABLE_NAME[table]).delete().eq("id", String(body.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
