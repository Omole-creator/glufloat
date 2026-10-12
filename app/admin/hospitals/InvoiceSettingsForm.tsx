"use client";

import { useState } from "react";
import type { InvoiceSettings } from "@/lib/invoiceSettings";

/** The bank details and VAT switch printed on hospital quotes and invoices. */
export default function InvoiceSettingsForm({ initial }: { initial: InvoiceSettings }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/hospitals/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Saved." : j.error ?? "Could not save.");
  };

  const field = "mt-1 w-full rounded-xl border border-[#e3e9f1] px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand";
  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-bold text-ink-soft">
        Bank
        <input className={field} value={s.bankName} onChange={(e) => setS({ ...s, bankName: e.target.value })} placeholder="e.g. Moniepoint" />
      </label>
      <label className="text-xs font-bold text-ink-soft">
        Account name
        <input className={field} value={s.accountName} onChange={(e) => setS({ ...s, accountName: e.target.value })} />
      </label>
      <label className="text-xs font-bold text-ink-soft">
        Account number
        <input
          className={field}
          inputMode="numeric"
          value={s.accountNumber}
          onChange={(e) => setS({ ...s, accountNumber: e.target.value })}
        />
      </label>
      <label className="text-xs font-bold text-ink-soft">
        Signed by
        <input className={field} value={s.signName} onChange={(e) => setS({ ...s, signName: e.target.value })} />
      </label>
      <label className="text-xs font-bold text-ink-soft">
        Their title
        <input className={field} value={s.signTitle} onChange={(e) => setS({ ...s, signTitle: e.target.value })} />
      </label>
      <div className="text-xs font-bold text-ink-soft">
        Signature (PNG)
        <div className="mt-1 flex items-center gap-3">
          {s.signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.signature} alt="Signature on invoices" className="h-10 rounded-lg bg-white ring-1 ring-[#e3e9f1]" />
          ) : (
            <span className="font-normal text-ink-soft">None yet</span>
          )}
          <label className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand">
            {s.signature ? "Change" : "Upload"}
            <input
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 300_000) return setMsg("Please use a PNG under 300KB.");
                const r = new FileReader();
                r.onload = () => setS((cur) => ({ ...cur, signature: String(r.result) }));
                r.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
        <input type="checkbox" checked={s.vatOn} onChange={(e) => setS({ ...s, vatOn: e.target.checked })} className="h-4 w-4" />
        Add 7.5% VAT to new quotes and invoices (only once GluFloat is VAT-registered)
      </label>
      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-sm text-ink-soft">{msg}</span>}
        <button disabled={busy} className="rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
          Save
        </button>
      </div>
    </form>
  );
}
