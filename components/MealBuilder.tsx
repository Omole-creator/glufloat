"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, AlertTriangle, X, Plus } from "lucide-react";
import { searchFoods } from "@/lib/search";
import { scoreMeal } from "@/lib/verdictEngine";
import type { Food, MealItem, PortionSize } from "@/lib/types";
import { PortionMini } from "./PortionVisual";
import { events } from "@/lib/analytics";

const PORTIONS: { key: PortionSize; label: string }[] = [
  { key: "half", label: "Small" },
  { key: "normal", label: "Normal" },
  { key: "large", label: "Large" },
];

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

const VERDICT_UI = {
  green: {
    band: "bg-verdict-green",
    card: "border-verdict-green/50 bg-verdict-green/5",
    Icon: Check,
    word: "Good to eat",
  },
  yellow: {
    band: "bg-verdict-yellow",
    card: "border-verdict-yellow/60 bg-verdict-yellow/5",
    Icon: AlertTriangle,
    word: "Eat with care",
  },
  red: {
    band: "bg-verdict-red",
    card: "border-verdict-red/50 bg-verdict-red/5",
    Icon: X,
    word: "Better to skip",
  },
} as const;

export default function MealBuilder() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MealItem[]>([]);

  const results = useMemo(() => searchFoods(query, 6), [query]);
  const result = useMemo(() => scoreMeal(items), [items]);

  useEffect(() => {
    if (items.length > 0) events.mealBuilt(result.verdict);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.verdict, items.length]);

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
  const showVerdict = items.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* left: build the food */}
      <div>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a food... eba, egusi, fish"
            className="w-full rounded-full border-2 border-line bg-white px-5 py-3.5 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft/50 focus:border-leaf"
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
                  <span className="flex items-center gap-1 text-xs font-bold text-leaf">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-sm text-ink-soft">
              Add everything you are eating: your swallow or rice, the soup, the
              meat or fish, and the drink.
            </div>
          )}
          {items.map((i) => (
            <div
              key={i.food.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm"
            >
              <span className={`h-3 w-3 shrink-0 rounded-full ${DOT[i.food.baseVerdict]}`} />
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
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {items.some((i) => i.food.role === "starch") && (
            <p className="px-1 text-xs text-ink-soft">
              Tap Small, Normal, or Large to change how much swallow or rice you
              are eating.
            </p>
          )}
        </div>
      </div>

      {/* right: the answer, made obvious */}
      <div>
        <div
          key={`${result.verdict}-${items.length}-${items.map((i) => i.portion).join()}`}
          className={`overflow-hidden rounded-2xl border-2 shadow-[0_16px_40px_-18px_rgba(12,42,71,0.35)] ${
            showVerdict ? ui.card : "border-line bg-white"
          }`}
        >
          {/* big colour band with the plain word */}
          <div
            className={`verdict-pop flex items-center gap-4 px-6 py-5 text-white ${
              showVerdict ? ui.band : "bg-ink/80"
            }`}
          >
            <span className="green-burst flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/25">
              {showVerdict ? (
                <ui.Icon className="h-8 w-8" strokeWidth={3} />
              ) : (
                <span className="text-2xl">?</span>
              )}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                Your answer
              </p>
              <p className="font-display text-2xl font-bold leading-tight">
                {showVerdict ? ui.word : "Add your food"}
              </p>
            </div>
          </div>

          <div className="p-6">
            <p className="text-base font-semibold text-ink">
              {result.headline}
            </p>

            {result.breakdown.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
                {result.breakdown.map((b, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-ink-soft/50">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {result.fixes.length > 0 ? (
              <div className="mt-4 rounded-xl bg-mint p-4">
                <p className="text-sm font-bold text-leaf-deep">
                  Do this to make it green:
                </p>
                <ul className="mt-2 space-y-2 text-sm text-ink">
                  {(() => {
                    let step = 0;
                    return result.fixes.map((f, idx) => {
                      // A "Note:" line is a health warning, not a step. Show it
                      // in red and skip the numbering so the steps stay in order.
                      if (f.startsWith("Note:")) {
                        return (
                          <li
                            key={idx}
                            className="rounded-lg border border-verdict-red/40 bg-verdict-red/10 px-3 py-2 font-medium text-verdict-red"
                          >
                            {f}
                          </li>
                        );
                      }
                      step += 1;
                      return (
                        <li key={idx} className="flex gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-bold text-white">
                            {step}
                          </span>
                          <span>{f}</span>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            ) : showVerdict && result.verdict === "green" ? (
              <div className="green-burst mt-4 flex items-center gap-3 rounded-xl bg-verdict-green/10 p-4">
                <Check className="h-6 w-6 shrink-0 text-leaf-deep" strokeWidth={3} />
                <p className="text-sm font-semibold text-ink">
                  Nothing to change. This is a good meal for your sugar.
                </p>
              </div>
            ) : null}

            {showVerdict &&
              (() => {
                // Surface the health note of any food on the plate (red/organ
                // meat, salty, oily), so build-a-meal warns the same as search.
                const notes = [
                  ...new Set(
                    items.map((i) => i.food.healthNote).filter(Boolean),
                  ),
                ];
                return notes.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {notes.map((n, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-verdict-red/40 bg-verdict-red/10 p-3"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wider text-verdict-red">
                          Please note
                        </p>
                        <p className="mt-1 text-sm text-ink">{n}</p>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

            {showVerdict && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-ink/60">
                  How much of each to eat
                </p>
                <div className="mt-3 space-y-3">
                  {items.map((i) => (
                    <PortionMini key={i.food.id} food={i.food} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
