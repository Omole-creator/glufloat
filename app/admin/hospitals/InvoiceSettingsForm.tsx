"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil } from "lucide-react";
import type { InvoiceSettings } from "@/lib/invoiceSettings";

/**
 * The bank details, signature and VAT switch printed on hospital quotes and
 * invoices. Once saved it folds into a one-line summary (founder, 2026-10-12:
 * it said "Saved" but stayed open, so it looked like nothing had happened).
 */
export default function InvoiceSettingsForm({ initial }: { initial: InvoiceSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(!initial.accountNumber);
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
    if (!res.ok) return setMsg(j.error ?? "Could not save.");
    setSaved(s);
    setEditing(false);
    router.refresh();
  };

  if (!editing)
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-3 py-1 text-sm font-bold text-leaf-deep">
          <CheckCircle2 className="h-4 w-4" /> Saved
        </span>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div><dt className="inline text-ink-soft">Bank: </dt><dd className="inline font-semibold text-ink">{saved.bankName || "-"}</dd></div>
          <div><dt className="inline text-ink-soft">Account: </dt><dd className="inline font-semibold text-ink">{saved.accountName || "-"} {saved.accountNumber ? `····${saved.accountNumber.slice(-4)}` : ""}</dd></div>
          <div><dt className="inline text-ink-soft">Signed by: </dt><dd className="inline font-semibold text-ink">{saved.signName || "-"}</dd></div>
          <div className="flex items-center gap-2">
            <dt className="text-ink-soft">Signature: </dt>
            <dd>
              {saved.signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={saved.signature} alt="Signature on invoices" className="h-7 rounded bg-white ring-1 ring-[#e3e9f1]" />
              ) : (
                <span className="font-semibold text-verdict-red">not added</span>
              )}
            </dd>
          </div>
          <div><dt className="inline text-ink-soft">VAT: </dt><dd className="inline font-semibold text-ink">{saved.vatOn ? "7.5% added" : "off"}</dd></div>
        </dl>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink hover:border-brand"
        >
          <Pencil className="h-4 w-4" /> Edit
        </button>
      </div>
    );

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
        <input className={field} inputMode="numeric" value={s.accountNumber} onChange={(e) => setS({ ...s, accountNumber: e.target.value })} />
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
                // Put it on solid white: a see-through background is drawn
                // BLACK by some PDF readers and screens, and an invoice is
                // white paper anyway.
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                  const c = document.createElement("canvas");
                  const scale = Math.min(1, 600 / img.width);
                  c.width = Math.round(img.width * scale);
                  c.height = Math.round(img.height * scale);
                  const g = c.getContext("2d");
                  if (!g) return;
                  g.fillStyle = "#ffffff";
                  g.fillRect(0, 0, c.width, c.height);
                  g.drawImage(img, 0, 0, c.width, c.height);
                  URL.revokeObjectURL(url);
                  setS((cur) => ({ ...cur, signature: c.toDataURL("image/png") }));
                };
                img.src = url;
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
        {msg && <span className="text-sm text-verdict-red">{msg}</span>}
        {saved.accountNumber && (
          <button type="button" onClick={() => { setS(saved); setEditing(false); }} className="text-sm font-semibold text-ink-soft hover:text-ink">
            Cancel
          </button>
        )}
        <button disabled={busy} className="rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
          {busy ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
