"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dietitianPercent, dietitianShareNaira, GLUFLOAT_SHARE, naira, parsePatientPrice, PATIENT_PRICE_MIN } from "@/lib/patientPays";

/**
 * A dietitian sets her monthly price per patient (patient-pays-schema.sql),
 * and sees, as she types, exactly what she gets from each payment.
 */
export default function PriceForm({ price, hid }: { price: number; hid: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(String(price));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const parsed = parsePatientPrice(value);
  const shown = "price" in parsed ? parsed.price : price;

  const save = async () => {
    if ("error" in parsed) return setErr(parsed.error);
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/hospital/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: parsed.price, hid }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "That did not save. Please try again.");
    setMsg("Saved. Your new price applies from each patient's next payment.");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">Your price</h2>
      <p className="mt-1 text-sm text-ink-soft">
        What each patient pays you every month, inside GluFloat. At least {naira(PATIENT_PRICE_MIN)}.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <label className="text-xs font-semibold text-ink-soft">
          Price a month (₦)
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setErr("");
              setMsg("");
            }}
            inputMode="numeric"
            aria-label="Your price a month, in naira"
            className="mt-1 block h-12 w-40 rounded-xl border border-line bg-white px-3 font-display text-lg font-bold text-ink outline-none focus:border-brand"
          />
        </label>
        <button
          // Greyed out only when nothing has changed. A price that is not
          // allowed keeps the button live, so pressing it says why.
          disabled={busy || ("price" in parsed && parsed.price === price)}
          className="h-12 rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save my price"}
        </button>
      </form>
      {err && <p className="mt-2 text-sm font-semibold text-verdict-red">{err}</p>}
      {msg && <p className="mt-2 text-sm font-semibold text-leaf-deep">{msg}</p>}

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[#f3f6fa] px-2 py-3">
          <dt className="text-[11px] font-semibold text-ink-soft">Patient pays</dt>
          <dd className="font-display text-lg font-bold text-ink">{naira(shown)}</dd>
        </div>
        <div className="rounded-xl bg-[#f3f6fa] px-2 py-3">
          <dt className="text-[11px] font-semibold text-ink-soft">GluFloat keeps</dt>
          <dd className="font-display text-lg font-bold text-ink">{naira(GLUFLOAT_SHARE)}</dd>
        </div>
        <div className="rounded-xl bg-leaf/10 px-2 py-3 ring-1 ring-inset ring-leaf/20">
          <dt className="text-[11px] font-semibold text-leaf-deep">You get</dt>
          <dd className="font-display text-lg font-bold text-leaf-deep">
            {naira(dietitianShareNaira(shown))} <span className="text-xs font-semibold">({dietitianPercent(shown)}%)</span>
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-soft">
        For each patient, every month they pay. Paystack&apos;s fee comes out of GluFloat&apos;s share, never yours. Each new
        patient gets 14 free days first.
      </p>
    </section>
  );
}
