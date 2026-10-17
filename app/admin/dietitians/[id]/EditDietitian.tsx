"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Fix a dietitian's details and price (PATCH /api/admin/dietitians, action "edit"). */
export default function EditDietitian({
  id,
  initial,
}: {
  id: string;
  initial: { name: string; phone: string; email: string; dcn: string; price: number };
}) {
  const router = useRouter();
  const [v, setV] = useState({ ...initial, price: String(initial.price) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV({ ...v, [k]: e.target.value });
    setMsg("");
    setErr("");
  };
  const save = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/admin/dietitians", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "edit", ...v }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "That did not save.");
    setMsg("Saved.");
    router.refresh();
  };
  const box = "mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className="text-xs font-semibold text-ink-soft">
        Name
        <input value={v.name} onChange={set("name")} required className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        DCN number
        <input value={v.dcn} onChange={set("dcn")} className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        WhatsApp number
        <input value={v.phone} onChange={set("phone")} inputMode="tel" className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        Email
        <input value={v.email} onChange={set("email")} type="email" className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        Price a month (₦)
        <input value={v.price} onChange={set("price")} inputMode="numeric" className={box} />
      </label>
      <div className="flex items-end gap-3">
        <button disabled={busy || !v.name.trim()} className="h-11 rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
          {busy ? "Saving..." : "Save changes"}
        </button>
        {msg && <span className="text-sm font-semibold text-leaf-deep">{msg}</span>}
      </div>
      {err && <p className="text-sm font-semibold text-verdict-red sm:col-span-2 lg:col-span-3">{err}</p>}
    </form>
  );
}
