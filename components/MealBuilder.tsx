"use client";

import { useEffect, useMemo, useState } from "react";
import { searchFoods } from "@/lib/search";
import { scoreMeal } from "@/lib/verdictEngine";
import type { Food, MealItem, PortionSize } from "@/lib/types";
import Paywall from "./Paywall";
import { hasAccess } from "@/lib/access";

const PORTIONS: { key: PortionSize; label: string }[] = [
  { key: "half", label: "Half" },
  { key: "normal", label: "Normal" },
  { key: "large", label: "Large" },
];

const VERDICT_UI = {
  green: {
    bg: "bg-verdict-green",
    soft: "bg-verdict-green/10 border-verdict-green/40",
    label: "GREEN",
  },
  yellow: {
    bg: "bg-verdict-yellow",
    soft: "bg-verdict-yellow/10 border-verdict-yellow/50",
    label: "YELLOW",
  },
  red: {
    bg: "bg-verdict-red",
    soft: "bg-verdict-red/10 border-verdict-red/40",
    label: "RED",
  },
} as const;

export default function MealBuilder() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MealItem[]>([]);

  // hasAccess touches localStorage; resolve after mount
  useEffect(() => {
    setUnlocked(hasAccess());
  }, []);

  const results = useMemo(() => searchFoods(query, 6), [query]);
  const result = useMemo(() => scoreMeal(items), [items]);

  if (!unlocked) {
    return <Paywall context="meal" />;
  }

  const add = (food: Food) => {
    if (items.some((i) => i.food.id === food.id)) return;
    setItems([...items, { food, portion: "normal" }]);
    setQuery("");
  };

  const setPortion = (id: string, portion: PortionSize) =>
    setItems(items.map((i) => (i.food.id === id ? { ...i, portion } : i)));

  const remove = (id: string) =>
    setItems(items.filter((i) => i.food.id !== id));

  const ui = VERDICT_UI[result.verdict];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* left: build the plate */}
      <div>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add food to your plate... eba, egusi, fish"
            className="w-full rounded-full border-2 border-line bg-white py-3.5 px-5 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft/50 focus:border-leaf"
            aria-label="Add a food to your meal"
          />
        </div>

        {results.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => add(f)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left text-sm transition-colors hover:bg-mint"
                >
                  <span className="font-medium text-ink">{f.name}</span>
                  <span className="text-xs font-bold text-leaf">+ Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-sm text-ink-soft">
              Your plate is empty. Add your swallow, soup, protein, and drink
              the way you would really eat.
            </div>
          )}
          {items.map((i) => (
            <div
              key={i.food.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm"
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${VERDICT_UI[i.food.baseVerdict].bg}`}
              />
              <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                {i.food.name}
              </span>

              {i.food.role === "starch" && (
                <div className="flex rounded-full bg-mist p-1">
                  {PORTIONS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPortion(i.food.id, p.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        i.portion === p.key
                          ? "bg-brand text-white"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => remove(i.food.id)}
                aria-label={`Remove ${i.food.name}`}
                className="text-ink-soft/60 transition-colors hover:text-verdict-red"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* right: the verdict */}
      <div>
        <div
          className={`verdict-pop rounded-2xl border-2 ${ui.soft} bg-white p-6 shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]`}
          key={`${result.verdict}-${items.length}-${items.map((i) => i.portion).join()}`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${ui.bg} text-lg font-black text-white shadow-lg`}
            >
              {items.length}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                Meal verdict
              </p>
              <p className="font-display text-2xl font-bold text-ink">
                {items.length === 0 ? "—" : ui.label}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-ink">{result.headline}</p>

          {result.breakdown.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs leading-relaxed text-ink-soft">
              {result.breakdown.map((b, idx) => (
                <li key={idx}>• {b}</li>
              ))}
            </ul>
          )}

          {result.fixes.length > 0 && (
            <div className="mt-4 rounded-xl bg-mint p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-leaf-deep">
                The fix
              </p>
              <ul className="mt-2 space-y-2 text-sm text-ink">
                {result.fixes.map((f, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-bold text-leaf">{idx + 1}.</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
