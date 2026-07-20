"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { monthStats } from "@/lib/history";
import { swapsByName } from "@/lib/variety";
import type { Food } from "@/lib/types";

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

/**
 * When someone leans on the same food again and again, gently open their world a
 * little: safe foods in the same group they might enjoy for a change. This is
 * value a one-off lookup cannot give, and it does not run dry once they have
 * learned their own rotation.
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
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
        <Sparkles className="h-4 w-4" /> Something new to try
      </p>
      <p className="mt-1 text-sm text-ink">
        You have had <strong className="font-semibold">{data.food.name}</strong>{" "}
        a lot lately. These are just as safe, if you fancy a change.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.swaps.map((f) => (
          <button
            key={f.id}
            onClick={() => onOpenFood(f)}
            className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-brand"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[f.baseVerdict]}`} />
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}
