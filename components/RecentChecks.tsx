"use client";

import { useEffect, useState } from "react";
import { recentChecks, type MealCheck } from "@/lib/history";
import { FOODS } from "@/lib/search";
import type { Food } from "@/lib/types";

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

/**
 * "Your recent checks": the foods and meals this person looked at, so the app
 * greets them with their own history instead of an empty box. A single food is a
 * button that opens its card again; a whole meal is shown but not tappable (it
 * cannot be reopened as one card).
 */
export default function RecentChecks({
  onOpenFood,
}: {
  onOpenFood: (food: Food) => void;
}) {
  const [rows, setRows] = useState<MealCheck[] | null>(null);

  useEffect(() => {
    recentChecks(8).then(setRows);
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
        Your recent checks
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {rows.map((r) => {
          const food =
            r.kind === "single"
              ? FOODS.find((f) => f.name === r.label)
              : undefined;
          const inner = (
            <>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[r.verdict]}`} />
              <span className="max-w-[14rem] truncate">{r.label}</span>
            </>
          );
          const base =
            "flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink";
          return food ? (
            <button
              key={r.id}
              onClick={() => onOpenFood(food)}
              className={`${base} transition-colors hover:border-brand`}
            >
              {inner}
            </button>
          ) : (
            <span key={r.id} className={base}>
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
