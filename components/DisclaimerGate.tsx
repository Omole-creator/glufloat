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
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold text-brand">Please read this first</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink">
          Glufloat helps you choose food. It is not medical advice.
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
          <p>
            Glufloat tells you if a food is good, fair, or poor for a person
            living with diabetes, and how to make it better for your sugar.
          </p>
          <p>
            It does not test you, treat you, or cure anything. It is not your
            doctor, and it does not know your own health.
          </p>
          <p>
            Keep taking your medicine the way you were told. Keep checking your
            sugar the way you were shown. If you feel unwell, or your sugar is
            very high or very low, get help at once. Do not wait to check the
            app.
          </p>
        </div>

        <button
          onClick={() => {
            acceptDisclaimer();
            setOpen(false);
          }}
          className="mt-6 w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
        >
          I understand. Show me my food answers.
        </button>
      </div>
    </div>
  );
}
