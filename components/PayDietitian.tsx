"use client";

import { useState } from "react";
import { naira } from "@/lib/patientPays";

/**
 * A dietitian's patient pays her for one month (patient-pays-schema.sql).
 * The price shown is only for the label: the server reads the real price
 * from the database and asks Paystack for exactly that (/api/practice/pay).
 */
export default function PayDietitian({
  price,
  label,
  className = "",
}: {
  price: number;
  /** Defaults to "Pay ₦N". */
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pay = async () => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/practice/pay", { method: "POST" }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && typeof j.url === "string") {
      window.location.href = j.url;
      return;
    }
    setBusy(false);
    setErr(j.error ?? "We could not start the payment. Please try again.");
  };
  return (
    <div className={className}>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-leaf px-6 text-base font-bold text-white shadow-[0_12px_28px_-14px_rgba(62,155,79,0.9)] hover:bg-leaf-deep disabled:opacity-60"
      >
        {busy ? "Opening payment..." : label ?? `Pay ${naira(price)}`}
      </button>
      {err && <p className="mt-2 text-sm font-semibold text-verdict-red">{err}</p>}
    </div>
  );
}
