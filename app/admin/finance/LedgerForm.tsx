"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FIELDS, type LedgerTable } from "@/lib/financeConfig";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Add or change one ledger entry. The fields come from FIELDS in
 * lib/financeConfig.ts, which the route checks against too, so the form and
 * the server can never disagree about what an entry is.
 *
 * `idPrefix` keeps every input's id unique when several forms are on one page
 * (an add form and an edit form open at once), so each label still points at
 * its own box.
 */
export default function LedgerForm({
  table,
  id,
  initial,
  defaults,
  hide = [],
  only = {},
  submitLabel,
  onDone,
  onCancel,
  disabled,
  idPrefix,
}: {
  table: LedgerTable;
  /** When set, the form changes this entry instead of adding one. */
  id?: string;
  initial?: Record<string, string>;
  /** Starting values for a new entry, e.g. paid_by = "omole". */
  defaults?: Record<string, string>;
  /** Fields fixed by `defaults` that the person does not need to see. */
  hide?: string[];
  /** Narrow a drop-down to some of its choices, e.g. paid_by to the founders. */
  only?: Record<string, string[]>;
  submitLabel: string;
  onDone?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const router = useRouter();
  const fields = FIELDS[table];
  const blank = () => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.name] = f.type === "date" ? today() : f.options?.[0]?.value ?? "";
    return { ...v, ...defaults, ...initial };
  };
  const [values, setValues] = useState<Record<string, string>>(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/finance", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ table, id, row: values }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r || !r.ok) {
      setErr(j.error || "This did not save. Check your connection and try again.");
      return;
    }
    if (!id) setValues(blank());
    router.refresh();
    onDone?.();
  }

  const box =
    "mt-1 h-10 w-full rounded-lg border border-[#e3e9f1] bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-brand disabled:bg-[#f8fafc]";

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {fields
        .filter((f) => !hide.includes(f.name))
        .map((f) => {
          const fid = `${idPrefix}-${f.name}`;
          return (
            <label key={f.name} htmlFor={fid} className={`block text-xs font-bold text-ink/70 ${f.wide ? "sm:col-span-2" : ""}`}>
              {f.label}
              {f.type === "select" ? (
                <select
                  id={fid}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  className={box}
                  disabled={disabled || busy}
                >
                  {f.options!.filter((o) => !only[f.name] || only[f.name].includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={fid}
                  type={f.type === "date" ? "date" : "text"}
                  inputMode={f.type === "amount" ? "decimal" : undefined}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  placeholder={f.placeholder}
                  required={f.required}
                  className={box}
                  disabled={disabled || busy}
                />
              )}
            </label>
          );
        })}
      {err && <p className="text-sm font-semibold text-verdict-red sm:col-span-2">{err}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={disabled || busy}
          className="h-10 rounded-lg bg-leaf px-4 text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-50"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-[#e3e9f1] bg-white px-4 text-sm font-bold text-ink hover:border-brand/40"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
