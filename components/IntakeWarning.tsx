"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getIntake, intakeWarning, type Intake } from "@/lib/intake";
import type { Verdict } from "@/lib/types";

/**
 * A prominent warning shown when a person is about to eat a food that would
 * break the how-often rule for its colour (e.g. a second fast-sugar food in one
 * day). Reads their own eaten log; shows nothing when there is no problem.
 */
export default function IntakeWarning({ verdict }: { verdict: Verdict }) {
  const [intake, setIntake] = useState<Intake | null>(null);

  useEffect(() => {
    getIntake().then(setIntake);
  }, []);

  if (!intake) return null;
  const warn = intakeWarning(intake, verdict);
  if (!warn) return null;

  const red = warn.level === "red";
  return (
    <div
      className={`flex gap-3 rounded-xl border-2 p-4 ${
        red
          ? "border-verdict-red bg-verdict-red/10"
          : "border-verdict-yellow bg-verdict-yellow/15"
      }`}
    >
      <AlertTriangle
        className={`h-6 w-6 shrink-0 ${red ? "text-verdict-red" : "text-ink"}`}
        strokeWidth={2.5}
      />
      <div>
        <p
          className={`font-display text-sm font-bold ${
            red ? "text-verdict-red" : "text-ink"
          }`}
        >
          {warn.title}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink">{warn.text}</p>
      </div>
    </div>
  );
}
