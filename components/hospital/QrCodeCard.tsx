"use client";

import { useState } from "react";
import { Download, QrCode } from "lucide-react";
import { buildPosterPdf, joinShort } from "@/lib/hospitalPdf";

/**
 * The QR code box on the Plan page: the join address, the code, and the
 * printable QR code PDF. Shared by hospitals and dietitians.
 */
export default function QrCodeCard({
  name,
  code,
  open,
  practice = false,
}: {
  name: string;
  code: string;
  /** False when patients cannot join right now (the plan ended). */
  open: boolean;
  practice?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="h-fit rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf-deep">
          <QrCode className="h-5 w-5" />
        </span>
        <h2 className="font-display text-lg font-bold text-ink">Your QR code</h2>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {practice
          ? "Print it for your clinic, or send it to your patients. They scan it with their phone camera to join. Everyone who joins shows up on your patient list."
          : "Print it and put it where your patients wait. They scan it with their phone camera to join. Everyone who joins shows up on your patient list."}
      </p>
      <div className="mt-4 rounded-2xl bg-mist/70 px-4 py-5 text-center">
        <p className="text-xs font-semibold text-ink-soft">Your join address</p>
        <p className="mt-1 font-display text-xl font-bold text-brand">{joinShort(code)}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {practice ? "Your code" : "Your hospital code"}: {code}
        </p>
      </div>
      <button
        disabled={busy || !open}
        onClick={async () => {
          setBusy(true);
          try {
            (await buildPosterPdf({ name, code })).save(`glufloat-qr-code-${code}.pdf`);
          } finally {
            setBusy(false);
          }
        }}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
      >
        <Download className="h-4 w-4" /> {busy ? "Getting it ready..." : "Download QR code"}
      </button>
    </section>
  );
}
