"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { monthStats } from "@/lib/history";
import { swapsByName } from "@/lib/variety";
import type { Food } from "@/lib/types";
import CollapsibleCard from "./CollapsibleCard";

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
  open,
  onToggle,
}: {
  onOpenFood: (food: Food) => void;
  open: boolean;
  onToggle: () => void;
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
    <CollapsibleCard
      open={open}
      onToggle={onToggle}
      headerClass="bg-leaf"
      borderClass="border-leaf/40"
      header={
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 shrink-0" strokeWidth={2.2} />
          <span className="font-display text-xl font-bold leading-tight">
            Something New to Try
          </span>
        </div>
      }
    >
      <p className="text-sm text-ink">
        You have had <strong className="font-semibold">{data.food.name}</strong> a
        lot lately. These are just as safe, if you fancy a change.
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
    </CollapsibleCard>
  );
}
