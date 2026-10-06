"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import LedgerForm from "./LedgerForm";
import {
  categoryOf,
  FOUNDERS,
  INCOME_LABEL,
  naira,
  PAYER_LABEL,
  type ExpenseRow,
  type IncomeRow,
  type LedgerTable,
  type LoanMoveRow,
} from "@/lib/financeConfig";

type AnyRow = ExpenseRow | IncomeRow | LoanMoveRow;

const date = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** What each kind of entry says on its row: when, what, the small print, and how much. */
function describe(table: LedgerTable, r: AnyRow) {
  if (table === "expense") {
    const e = r as ExpenseRow;
    return {
      when: e.spent_on,
      title: e.description,
      meta: [categoryOf(e.category).label, e.vendor ? `to ${e.vendor}` : null, `paid by ${PAYER_LABEL[e.paid_by]}`]
        .filter(Boolean)
        .join(" · "),
      amount: e.amount,
      sign: -1,
      chip: e.paid_by === "company" ? null : "Founder loan",
    };
  }
  if (table === "income") {
    const i = r as IncomeRow;
    return {
      when: i.received_on,
      title: i.source,
      meta: [INCOME_LABEL[i.kind], i.note].filter(Boolean).join(" · "),
      amount: i.amount,
      sign: 1,
      chip: null,
    };
  }
  const l = r as LoanMoveRow;
  const f = FOUNDERS.find((x) => x.key === l.founder)!;
  return {
    when: l.happened_on,
    title: l.kind === "cash_in" ? `${f.name} put cash into GluFloat` : `GluFloat paid ${f.name} back`,
    meta: l.note ?? "",
    amount: l.amount,
    sign: l.kind === "repaid" ? -1 : 1,
    chip: null,
  };
}

/** Turn a stored row back into the form's values (kobo back to naira). */
function toForm(r: AnyRow): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    if (k === "id" || v === null || v === undefined) continue;
    out[k] = k === "amount" ? String(Number(v) / 100) : String(v);
  }
  return out;
}

export default function LedgerList({
  table,
  rows,
  empty,
  ready = true,
}: {
  table: LedgerTable;
  rows: AnyRow[];
  empty: string;
  ready?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function remove(r: AnyRow) {
    const d = describe(table, r);
    if (!confirm(`Delete "${d.title}" (${naira(d.amount)}) from ${date(d.when)}? This cannot be undone.`)) return;
    setBusy(r.id);
    setErr("");
    const res = await fetch("/api/admin/finance", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ table, id: r.id }),
    }).catch(() => null);
    setBusy(null);
    if (!res || !res.ok) {
      setErr("That did not delete. Check your connection and try again.");
      return;
    }
    router.refresh();
  }

  if (rows.length === 0) return <p className="px-5 py-10 text-center text-sm text-ink-soft sm:px-6">{empty}</p>;

  return (
    <div>
      {err && <p className="mx-5 mb-3 text-sm font-semibold text-verdict-red sm:mx-6">{err}</p>}
      <ul className="divide-y divide-[#eef2f7] border-t border-[#e3e9f1]">
        {rows.map((r) => {
          const d = describe(table, r);
          if (editing === r.id) {
            return (
              <li key={r.id} className="bg-[#f8fafc] px-5 py-4 sm:px-6">
                <LedgerForm
                  table={table}
                  id={r.id}
                  initial={toForm(r)}
                  submitLabel="Save changes"
                  idPrefix={`edit-${r.id}`}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            );
          }
          return (
            <li key={r.id} className="flex items-start gap-3 px-5 py-3.5 sm:items-center sm:px-6">
              <span className="hidden w-24 shrink-0 text-xs font-semibold text-ink-soft sm:block">{date(d.when)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {d.title}
                  {d.chip && (
                    <span className="ml-2 hidden rounded-full bg-brand/10 px-2 py-0.5 align-middle text-[11px] font-bold text-brand sm:inline">
                      {d.chip}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  <span className="sm:hidden">{date(d.when)} · </span>
                  {d.meta}
                </p>
              </div>
              <span className="shrink-0 font-display text-sm font-bold tabular-nums text-ink">
                {d.sign < 0 ? "-" : "+"}
                {naira(d.amount)}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(r.id)}
                  disabled={!ready}
                  aria-label={`Edit ${d.title}, ${date(d.when)}`}
                  className="rounded-md p-1.5 text-ink-soft hover:bg-brand/10 hover:text-brand disabled:opacity-40"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => void remove(r)}
                  disabled={!ready || busy === r.id}
                  aria-label={`Delete ${d.title}, ${date(d.when)}`}
                  className="rounded-md p-1.5 text-ink-soft hover:bg-verdict-red/10 hover:text-verdict-red disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
