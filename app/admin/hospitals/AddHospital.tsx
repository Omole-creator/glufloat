"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

/** Add a hospital by hand, then land on its page to approve a pilot or invoice it. */
export default function AddHospital() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", contact_name: "", contact_phone: "", contact_email: "", city: "", state: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/hospitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Could not add it.");
    router.push(`/admin/hospitals/${j.id}`);
  };

  const field = "mt-1 w-full rounded-xl border border-[#e3e9f1] bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand";
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep"
      >
        <Plus className="h-4 w-4" /> Add a hospital
      </button>
    );
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-20" onClick={() => setOpen(false)}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Add a hospital</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-ink-soft hover:bg-mist">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">Next you can start its free pilot, or make its quote or invoice.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-ink-soft sm:col-span-2">
            Hospital name
            <input className={field} value={f.name} onChange={set("name")} required autoFocus />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Contact name
            <input className={field} value={f.contact_name} onChange={set("contact_name")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Contact WhatsApp
            <input className={field} type="tel" value={f.contact_phone} onChange={set("contact_phone")} />
          </label>
          <label className="text-xs font-bold text-ink-soft sm:col-span-2">
            Contact email
            <input className={field} type="email" value={f.contact_email} onChange={set("contact_email")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            City
            <input className={field} value={f.city} onChange={set("city")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            State
            <input className={field} value={f.state} onChange={set("state")} />
          </label>
        </div>
        {err && <p className="mt-3 text-sm text-verdict-red">{err}</p>}
        <div className="mt-5 flex justify-end">
          <button disabled={busy} className="rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
            {busy ? "Adding..." : "Add and open it"}
          </button>
        </div>
      </form>
    </div>
  );
}
