"use client";

import { useEffect, useState } from "react";
import { Flame, PartyPopper } from "lucide-react";
import { monthStats, type MonthStats } from "@/lib/history";
import { milestoneFor, progressLine, type Milestone } from "@/lib/milestones";

// The biggest milestone this device has already celebrated. Kept so a person is
// congratulated on reaching seven days, not reminded of it every time they open
// the app for the rest of the week.
const SEEN_KEY = "gf_milestone";

function alreadySeen(m: Milestone): boolean {
  try {
    return Number(localStorage.getItem(SEEN_KEY) || 0) >= m.rank;
  } catch {
    return false; // storage blocked: show it, rather than lose the moment
  }
}

function markSeen(m: Milestone): void {
  try {
    localStorage.setItem(SEEN_KEY, String(m.rank));
  } catch {
    /* ignore */
  }
}

/**
 * A small, warm reminder that they are building a habit: how many days in a row
 * they have checked, how many good meals they have had this month, and how that
 * compares with last month. It only shows once there is something to say, so a
 * first-time user is not shown a row of zeros.
 *
 * A milestone (seven days in a row, 25 good meals) is celebrated ONCE, above the
 * everyday line. Every word here is a count out of the person's own log; nothing
 * claims anything about their health.
 */
export default function HabitStreak() {
  const [s, setS] = useState<MonthStats | null>(null);
  const [party, setParty] = useState<Milestone | null>(null);

  useEffect(() => {
    monthStats().then((stats) => {
      setS(stats);
      const m = milestoneFor(stats);
      if (m && !alreadySeen(m)) {
        markSeen(m);
        setParty(m);
      }
    });
  }, []);

  if (!s || s.total === 0) return null;

  const lines: string[] = [];
  if (s.streakDays >= 2) {
    lines.push(`You have checked your meals ${s.streakDays} days in a row.`);
  }
  if (s.green > 0) {
    lines.push(`${s.green} good ${s.green === 1 ? "meal" : "meals"} this month.`);
  }
  const progress = progressLine(s);
  if (lines.length === 0 && !party && !progress) return null;

  return (
    <div className="space-y-3">
      {party && (
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-verdict-green/15 to-leaf/5 px-4 py-3.5 ring-1 ring-inset ring-leaf/25">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-leaf-deep shadow-sm">
            <PartyPopper className="h-5 w-5" />
          </span>
          <p className="font-display text-sm font-bold text-ink">{party.text}</p>
        </div>
      )}

      {(lines.length > 0 || progress) && (
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.04]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf/15 to-leaf/5 text-leaf-deep ring-1 ring-inset ring-leaf/15">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            {lines.length > 0 && (
              <p className="text-sm font-semibold text-ink">{lines.join(" ")}</p>
            )}
            {progress && (
              <p className="mt-0.5 text-sm text-ink-soft">{progress}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
