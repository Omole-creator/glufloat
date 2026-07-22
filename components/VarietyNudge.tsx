"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { monthStats } from "@/lib/history";
import { swapsByName } from "@/lib/variety";
import { cleanFoodName } from "@/lib/foodName";
import type { Food } from "@/lib/types";

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

/**
 * When someone leans on the same food again and again, gently open their world a
 * little: safe foods in the same group they might enjoy for a change.
 *
 * It is a quiet strip under today's meal, not a card of its own. It is a nudge
 * about a food they already like, so it must never look like a peer of the "what
 * should I eat now" answer, which is the reason they opened the app.
 */
export default function VarietyNudge({
  onOpenFood,
}: {
  onOpenFood: (food: Food) => void;
}) {
  const [data, setData] = useState<{ food: Food; swaps: Food[] } | null>(null);

  useEffect(() => {
    monthStats().then((s) => {
      if (s.topRepeat) {
        const r = swapsByName(s.topRepeat.label);
        if (r) setData(r);
      }
    });
  }, []);

  if (!data) return null;

  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.04]">
      <p className="flex items-center gap-2 text-sm text-ink">
        <Sparkles className="h-4 w-4 shrink-0 text-leaf-deep" />
        <span>
          You have had{" "}
          <strong className="font-semibold">
            {cleanFoodName(data.food.name)}
          </strong>{" "}
          a lot lately. These are just as safe, if you fancy a change.
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.swaps.map((f) => (
          <button
            key={f.id}
            onClick={() => onOpenFood(f)}
            className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-brand"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[f.baseVerdict]}`} />
            {cleanFoodName(f.name)}
          </button>
        ))}
      </div>
    </div>
  );
}
