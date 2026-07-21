"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { monthStats, type MonthStats } from "@/lib/history";

/**
 * A small, warm reminder that they are building a habit: how many days in a row
 * they have checked, and how many good meals they have had this month. It only
 * shows once there is something to say, so a first-time user is not shown a row
 * of zeros.
 */
export default function HabitStreak() {
  const [s, setS] = useState<MonthStats | null>(null);

  useEffect(() => {
    monthStats().then(setS);
  }, []);

  if (!s || s.total === 0) return null;

  const lines: string[] = [];
  if (s.streakDays >= 2) {
    lines.push(`You have checked your meals ${s.streakDays} days in a row.`);
  }
  if (s.green > 0) {
    lines.push(`${s.green} good ${s.green === 1 ? "meal" : "meals"} this month.`);
  }
  if (lines.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.04]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf/15 to-leaf/5 text-leaf-deep ring-1 ring-inset ring-leaf/15">
        <Flame className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-ink">{lines.join(" ")}</p>
    </div>
  );
}
