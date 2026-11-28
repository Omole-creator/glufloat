"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { naira } from "@/lib/patientPays";

/**
 * A dietitian's terms for one patient (founder, 2026-11-28): their own price,
 * which she can change at any time (from their next payment), and, until they
 * first pay her, their free days (none or 7).
 */
export default function PatientTermsEditor({
  patientId,
  hid,
  firstName,
  ownPrice,
  usualPrice,
  freeDays,
  canChangeFreeDays,
  paidUntilText,
}: {
  patientId: string;
  hid: string | null;
  firstName: string;
  /** Their own price, or null for her usual price. */
  ownPrice: number | null;
  usualPrice: number;
  /** Free days now in force for them (0 or 7), shown as chosen. */
  freeDays: number;
  /** True while they have joined and never paid her. */
  canChangeFreeDays: boolean;
  /** "Free until 5 December" / "Paid until 5 December", or null. */
  paidUntilText: string | null;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(ownPrice ? String(ownPrice) : "");
  const [days, setDays] = useState(freeDays);
  const [busy, setBusy] = useState<"price" | "days" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = async (action: "price" | "freedays", extra: Record<string, unknown>) => {
    setBusy(action === "price" ? "price" : "days");
    setMsg(null);
    const res = await fetch("/api/hospital/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: patientId, hid, action, ...extra }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMsg({ ok: false, text: j.error ?? "That did not save. Please try again." });
      return null;
    }
    router.refresh();
    return j;
  };

  const savePrice = async () => {
    const j = await patch("price", { price });
    if (j)
      setMsg({
        ok: true,
        text: j.price
          ? `Saved. ${firstName} pays ${naira(j.price)} from their next payment.`
          : `Saved. ${firstName} pays your usual ${naira(usualPrice)} from their next payment.`,
      });
  };

  const saveDays = async (d: number) => {
    const before = days;
    setDays(d);
    const j = await patch("freedays", { freeDays: d });
    if (!j) return setDays(before);
    setMsg({ ok: true, text: d > 0 ? `Saved. ${firstName} has a free week.` : `Saved. ${firstName} is asked to pay you now.` });
  };

  const field =
    "mt-1 block h-12 w-40 rounded-xl border border-line bg-white px-3 font-display text-lg font-bold text-ink outline-none focus:border-brand";

  return (
    <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">What {firstName} pays you</h2>
      {paidUntilText && <p className="mt-1 text-sm text-ink-soft">{paidUntilText}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void savePrice();
        }}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <label className="text-xs font-semibold text-ink-soft">
          Price a month (₦)
          <input
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setMsg(null);
            }}
            inputMode="numeric"
            placeholder={String(usualPrice)}
            aria-label={`${firstName}'s price a month, in naira`}
            className={field}
          />
        </label>
        <button
          disabled={busy !== null || price === (ownPrice ? String(ownPrice) : "")}
          className="h-12 rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          {busy === "price" ? "Saving..." : "Save price"}
        </button>
      </form>
      <p className="mt-2 text-xs text-ink-soft">
        Leave it empty for your usual price ({naira(usualPrice)}). A new price starts at their next payment.
      </p>

      {canChangeFreeDays && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-ink">Free days</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Free days for ${firstName}`}>
            {[
              { d: 0, title: "No free days", sub: "They pay you now." },
              { d: 7, title: "7 free days", sub: "From the day they joined." },
            ].map((o) => (
              <button
                key={o.d}
                type="button"
                role="radio"
                aria-checked={days === o.d}
                disabled={busy !== null}
                onClick={() => days !== o.d && void saveDays(o.d)}
                className={`rounded-xl border-2 p-3.5 text-left text-sm transition-colors disabled:opacity-60 ${
                  days === o.d ? "border-brand bg-brand/5" : "border-line bg-white hover:border-brand/40"
                }`}
              >
                <span className="block font-bold text-ink">{o.title}</span>
                <span className="block text-ink-soft">{o.sub}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">You can change this until {firstName} first pays you.</p>
        </div>
      )}

      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}
    </section>
  );
}
