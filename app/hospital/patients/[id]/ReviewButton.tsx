"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

/**
 * A GluFloat doctor marks this patient as reviewed (lib/careFeesServer.ts
 * creditReview). N1,000 is added to their earnings at once, once a month,
 * while the patient is on a paid GluFloat plan.
 */
export default function ReviewButton({
  patientId,
  hid,
  firstName,
  month,
  feeThisMonth,
  paying,
  reviewedAt,
}: {
  patientId: string;
  hid: string | null;
  firstName: string;
  /** "October": the month this review counts for. */
  month: string;
  feeThisMonth: boolean;
  paying: boolean;
  /** The last time this patient was marked reviewed, if remembered. */
  reviewedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const press = async () => {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/hospital/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hid, id: patientId, action: "reviewed" }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Something went wrong.");
      return;
    }
    if (!j.paying) setMsg(`Marked as reviewed. No fee: ${firstName} is not on a paid GluFloat plan right now.`);
    router.refresh();
  };

  const when = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })
    : "";

  if (feeThisMonth)
    return (
      <section className="mt-5 flex items-center gap-3 rounded-2xl border border-leaf/30 bg-leaf/5 p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-leaf-deep" aria-hidden />
        <p className="text-sm text-ink">
          <span className="font-bold">Reviewed for {month}.</span> ₦1,000 added to your earnings.
        </p>
      </section>
    );

  return (
    <section className="mt-5 rounded-2xl border border-[#e3e9f1] bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Monthly review</p>
          <p className="text-xs text-ink-soft">
            {paying
              ? `Look at ${firstName}'s meals and sugar tests, then mark as reviewed. You earn ₦1,000, once a month.`
              : `${firstName} is not on a paid GluFloat plan right now, so there is no fee for reviewing this month.`}
            {when ? ` Last marked as reviewed on ${when}.` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void press()}
          className="inline-flex items-center gap-1.5 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden /> {busy ? "Saving..." : "Mark as reviewed"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs font-semibold text-ink">{msg}</p>}
    </section>
  );
}
