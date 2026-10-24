"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { buildDoctorFlyerPdf } from "@/lib/hospitalPdf";
import { PREMIUM_MONTHLY } from "@/lib/hospitalPlans";

/** Downloads the doctor's patient flyer (half A4) with their own QR code. */
export default function DoctorFlyerButton({
  name,
  code,
  className,
  label = "Download flyer",
}: {
  name: string;
  code: string;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`${label} for ${name}`}
      onClick={async () => {
        setBusy(true);
        try {
          (await buildDoctorFlyerPdf({ name, code }, PREMIUM_MONTHLY)).save(`glufloat-flyer-${code}.pdf`);
        } finally {
          setBusy(false);
        }
      }}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full bg-leaf px-3.5 py-1.5 text-xs font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
      }
    >
      <Download className="h-3.5 w-3.5" /> {busy ? "Getting it ready..." : label}
    </button>
  );
}
