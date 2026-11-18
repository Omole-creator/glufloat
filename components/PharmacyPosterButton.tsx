"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { buildPharmacyPosterPdf } from "@/lib/hospitalPdf";
import { TIER_AMOUNTS } from "@/lib/pricing";

/** Downloads a pharmacy branch's A4 poster with its own QR code (founder, 2026-11-18). */
export default function PharmacyPosterButton({
  name,
  branch,
  code,
  className,
  label = "Download poster",
}: {
  name: string;
  branch: string | null;
  code: string;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const where = branch ? `${name}, ${branch}` : name;
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`${label} for ${where}`}
      onClick={async () => {
        setBusy(true);
        try {
          (await buildPharmacyPosterPdf({ name, branch, code }, TIER_AMOUNTS.basic / 100)).save(`glufloat-poster-${code.toLowerCase()}.pdf`);
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
