"use client";

import { useEffect, useState } from "react";
import { acceptDisclaimer, disclaimerAccepted } from "@/lib/access";

export default function DisclaimerGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!disclaimerAccepted());
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl sm:p-8">
        <h2 className="font-display text-2xl font-bold leading-snug text-ink">
          Glufloat helps you choose food. It does not cure diabetes.
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Everyone&apos;s body is different. The best check is your own. Test
          your sugar about two hours after eating to see what a food does for
          you.
        </p>

        <button
          onClick={() => {
            acceptDisclaimer();
            setOpen(false);
          }}
          className="mt-6 w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
        >
          I understand
        </button>
      </div>
    </div>
  );
}
