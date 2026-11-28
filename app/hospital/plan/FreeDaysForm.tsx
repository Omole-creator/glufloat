"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * A dietitian chooses the free days her new patients get (founder,
 * 2026-11-28): none, or 7. Used for anyone who joins by her QR code, and as
 * where the choice starts when she adds a patient by hand. Patients who have
 * already joined keep the days they were given.
 */
export default function FreeDaysForm({ days, hid }: { days: number; hid: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(days);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const save = async (d: number) => {
    setValue(d);
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/hospital/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freeDays: d, hid }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setValue(days);
      return setErr(j.error ?? "That did not save. Please try again.");
    }
    setMsg("Saved. This applies to patients who join from now on.");
    router.refresh();
  };

  const options = [
    { d: 0, title: "No free days", sub: "They pay you from the day they join." },
    { d: 7, title: "7 free days", sub: "They pay you after a free week." },
  ];

  return (
    <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6 lg:col-span-2">
      <h2 className="font-display text-lg font-bold text-ink">Free days for new patients</h2>
      <p className="mt-1 text-sm text-ink-soft">
        For patients who join by your QR code. When you add a patient yourself, you can choose for that patient.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Free days for new patients">
        {options.map((o) => (
          <button
            key={o.d}
            type="button"
            role="radio"
            aria-checked={value === o.d}
            disabled={busy}
            onClick={() => value !== o.d && void save(o.d)}
            className={`rounded-xl border-2 p-3.5 text-left text-sm transition-colors disabled:opacity-60 ${
              value === o.d ? "border-brand bg-brand/5" : "border-line bg-white hover:border-brand/40"
            }`}
          >
            <span className="block font-bold text-ink">{o.title}</span>
            <span className="block text-ink-soft">{o.sub}</span>
          </button>
        ))}
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-verdict-red">{err}</p>}
      {msg && <p className="mt-2 text-sm font-semibold text-leaf-deep">{msg}</p>}
    </section>
  );
}
