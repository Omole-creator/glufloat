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
        <p className="text-xs font-bold uppercase tracking-widest text-brand">
          Please read this first
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink">
          Glufloat is food information, not medical advice.
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
          <p>
            Glufloat shows you whether a food or meal is a good, fair, or poor
            choice for a person living with diabetes, and how to adjust it so
            it is gentler on your blood sugar.
          </p>
          <p>
            It does not diagnose, treat, cure, or reverse diabetes. It does not
            replace your doctor, nurse, pharmacist, or dietitian. It does not
            know your medical history or test results.
          </p>
          <p>
            Keep taking your medicine exactly as prescribed. Keep checking your
            blood sugar the way your doctor advised. If you feel unwell or your
            sugar is very high or very low, get medical help at once. Do not
            wait to check the app.
          </p>
          <p>
            Food guidance here is general. Food affects every person
            differently.
          </p>
        </div>

        <button
          onClick={() => {
            acceptDisclaimer();
            setOpen(false);
          }}
          className="mt-6 w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
        >
          I understand. Show me the food answers.
        </button>
      </div>
    </div>
  );
}
