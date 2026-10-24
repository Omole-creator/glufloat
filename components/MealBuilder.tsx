"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, AlertTriangle, X, Plus, Utensils, Sparkles, Scale, CalendarDays, Wheat, Flame, Pointer } from "lucide-react";
import { matchedAlias, searchFoods } from "@/lib/search";
import { scoreMeal } from "@/lib/verdictEngine";
import type { Food, MealItem } from "@/lib/types";
import { PortionMini } from "./PortionVisual";
import FoodIcon from "./FoodIcon";
import { mealFrequency } from "@/lib/frequency";
import { mealShareMessage } from "@/lib/shareMessage";
import ShareOnWhatsApp from "./ShareOnWhatsApp";
import IntakeWarning from "./IntakeWarning";
import ReadingRecall from "./ReadingRecall";
import StartMealSheet from "./StartMealSheet";
import { events } from "@/lib/analytics";
import { logImpression, suggestedFor } from "@/lib/mealImpressions";
import { trackUsage } from "@/lib/usage";
import { cleanFoodName } from "@/lib/foodName";
import { currentMeal } from "@/lib/mealtime";
import {
  readPersonalizationProfile,
  PERSONALIZATION_CHANGED,
  type MedTime,
} from "@/lib/personalizationProfile";
import { medicationAppliesToMeal, medicationTimingCopy } from "@/lib/medicationTiming";
import { Pill } from "lucide-react";

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

// Yellow is a light colour, so its band carries dark text; green and red
// carry white. The band is the one place the traffic light fills a surface.
const VERDICT_UI = {
  green: {
    band: "bg-gradient-to-br from-verdict-green to-leaf text-white",
    ring: "ring-verdict-green/40",
    iconChip: "bg-white/25 ring-white/40",
    eyebrow: "text-white/85",
    Icon: Check,
    word: "Good to eat",
  },
  yellow: {
    band: "bg-gradient-to-br from-verdict-yellow to-[#f5d34a] text-ink",
    ring: "ring-verdict-yellow/60",
    iconChip: "bg-white/45 ring-white/60",
    eyebrow: "text-ink/70",
    Icon: AlertTriangle,
    word: "Eat with care",
  },
  red: {
    band: "bg-gradient-to-br from-verdict-red to-[#c0392b] text-white",
    ring: "ring-verdict-red/40",
    iconChip: "bg-white/25 ring-white/40",
    eyebrow: "text-white/85",
    Icon: X,
    word: "Better to skip",
  },
} as const;

export default function MealBuilder({
  initialFoods = null,
}: {
  /** Preload the plate, e.g. from a single-food search or a suggested meal. */
  initialFoods?: Food[] | null;
} = {}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MealItem[]>([]);

  // Seed the plate from outside. A new array identity means a fresh seed action,
  // so we replace what is there (the person chose to start from this meal).
  useEffect(() => {
    if (initialFoods && initialFoods.length > 0) {
      setItems(initialFoods.map((f) => ({ food: f, portion: f.gluFloatSize ? ("half" as const) : ("normal" as const) })));
      setQuery("");
    }
  }, [initialFoods]);

  const results = useMemo(() => searchFoods(query, 6), [query]);
  const result = useMemo(() => scoreMeal(items), [items]);
  const often = useMemo(() => mealFrequency(items, result.stacked), [items, result.stacked]);
  // Each food's own GluFloat-size figures, summed. There is only one real,
  // dietitian-sourced size per food, so there is no size picker here: a
  // Small/Normal/Large tap used to sit on the starch and changed the colour
  // but not these numbers, which the co-founder dietitian flagged as the
  // data contradicting itself (2026-10-07). The person says how much they
  // really ate in StartMealSheet instead, where it is recorded, not scored.
  // carbG is rounded at the end, not per-food: it carries a decimal on over
  // half the foods (calories never does), and summing several real
  // decimals in JS floating point can land on something like
  // 30.799999999999997 (confirmed: White Rice 25.2 + Green Beans 5.6) — a
  // real display bug, not a hypothetical.
  const totals = useMemo(
    () => ({
      carbG: Math.round(items.reduce((s, i) => s + (i.food.carbG ?? 0), 0)),
      calories: items.reduce((s, i) => s + (i.food.calories ?? 0), 0),
    }),
    [items],
  );

  // Medication timing, free on every tier. There is no meal-slot picker in
  // the builder, so the current clock meal (same 3-band clock as TodaysMeal)
  // stands in for "which meal is this" — a reasonable proxy for what someone
  // is building right now.
  const [medTimes, setMedTimes] = useState<MedTime[]>([]);
  const [medRelationToFood, setMedRelationToFood] = useState<"before" | "after" | null>(null);
  useEffect(() => {
    const load = () =>
      readPersonalizationProfile().then((p) => {
        setMedTimes(p.medTimes);
        setMedRelationToFood(p.medRelationToFood);
      });
    load();
    window.addEventListener(PERSONALIZATION_CHANGED, load);
    return () => window.removeEventListener(PERSONALIZATION_CHANGED, load);
  }, []);
  const medicationNote =
    medicationAppliesToMeal(medTimes, currentMeal()) ? medicationTimingCopy(medRelationToFood) : null;

  useEffect(() => {
    if (items.length > 0) events.mealBuilt(result.verdict);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.verdict, items.length]);

  // Building a meal is NOT eating it, so nothing is saved automatically. The
  // person logs the plate to their food record only by tapping "I ate this meal".
  const [ate, setAte] = useState(false);
  // Any change to the plate clears a previous "eaten" tick, so an edited meal can
  // be logged again.
  useEffect(() => {
    setAte(false);
  }, [items]);
  // "I ate this meal" opens the save sheet (StartMealSheet): how much, and
  // whether they are about to eat (a meal test, with a sugar test before and 2
  // hours after) or already ate. The sheet does the saving; this records what
  // the builder alone knows, the blue-card plate it came from.
  const [sheetOpen, setSheetOpen] = useState(false);
  const mealLabel = items.map((i) => i.food.name).join(", ");
  const suggested = suggestedFor(items.map((i) => i.food.id));
  const logEaten = () => {
    if (items.length === 0) return;
    setSheetOpen(true);
  };
  const onLogged = () => {
    if (suggested) logImpression(suggested, "eaten");
    void trackUsage("meal_logged");
    setAte(true);
  };

  const add = (food: Food) => {
    if (items.some((i) => i.food.id === food.id)) return;
    setItems([...items, { food, portion: "normal" }]);
    setQuery("");
  };
  const remove = (id: string) =>
    setItems(items.filter((i) => i.food.id !== id));

  const ui = VERDICT_UI[result.verdict];
  const showVerdict = items.length > 0;
  const healthNotes = [...new Set(items.map((i) => i.food.healthNote).filter(Boolean))];
  const medicineNotes = [...new Set(items.map((i) => i.food.medicineNote).filter(Boolean))];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* left: build the food */}
      <div>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a food... eba, egusi, fish"
            className="w-full rounded-2xl border-2 border-line bg-white px-5 py-3.5 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft/50 focus:border-leaf"
            aria-label="Add a food to your meal"
          />
        </div>

        {results.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => add(f)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-mint"
                >
                  <FoodIcon food={f} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{cleanFoodName(f.name)}</span>
                    {matchedAlias(f, query, cleanFoodName(f.name)) && (
                      <span className="block text-xs text-ink-soft">
                        Same advice for {matchedAlias(f, query, cleanFoodName(f.name))}
                      </span>
                    )}
                  </span>
                  <span className="ml-3 flex shrink-0 items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf-deep">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line bg-white/60 px-6 py-9 text-center text-sm text-ink-soft">
              <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/[0.08] text-brand">
                <Utensils className="h-6 w-6" strokeWidth={2} />
              </span>
              Add everything you are eating: your swallow or rice, the soup, the
              meat or fish, and the drink.
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_-18px_rgba(12,42,71,0.35)] ring-1 ring-line">
              {items.map((i) => (
                <li key={i.food.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="relative">
                    <FoodIcon food={i.food} />
                    <span
                      aria-hidden
                      className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${DOT[i.food.baseVerdict]}`}
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                    {cleanFoodName(i.food.name)}
                  </span>
                  <button
                    onClick={() => remove(i.food.id)}
                    aria-label={`Remove ${i.food.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft/60 transition-colors hover:bg-verdict-red/10 hover:text-verdict-red"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* right: the answer, made obvious. Redesigned 2026-10-25 with the same
          words: colour only in the answer band and the main button, every
          section below under the same quiet heading style. */}
      <div>
        <div
          key={`${result.verdict}-${items.length}`}
          className={`overflow-hidden rounded-[28px] bg-white shadow-[0_28px_70px_-30px_rgba(12,42,71,0.5)] ring-1 ${
            showVerdict ? ui.ring : "ring-line"
          }`}
        >
          {/* The answer band: the word, the headline and the two numbers. */}
          <div
            className={`verdict-pop relative overflow-hidden px-5 pb-5 pt-6 sm:px-6 ${
              showVerdict ? ui.band : "bg-gradient-to-br from-ink/85 to-ink/70 text-white"
            }`}
          >
            <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
            {/* A small traffic light, the lit lamp matching the answer. */}
            <span
              aria-hidden
              className="absolute right-4 top-4 flex gap-1 rounded-full bg-ink/85 p-1.5 shadow-md ring-1 ring-white/30"
            >
              {(["red", "yellow", "green"] as const).map((c) => (
                <span
                  key={c}
                  className={`h-2.5 w-2.5 rounded-full ${
                    showVerdict && result.verdict === c
                      ? `${DOT[c]} shadow-[0_0_8px_2px_rgba(255,255,255,0.6)]`
                      : "bg-white/15"
                  }`}
                />
              ))}
            </span>

            <p className={`relative text-[11px] font-bold uppercase tracking-[0.18em] ${showVerdict ? ui.eyebrow : "text-white/80"}`}>
              Your answer
            </p>
            <div className="relative mt-3 flex items-center gap-4">
              <span
                className={`green-burst flex h-16 w-16 shrink-0 items-center justify-center rounded-full ring-[6px] ${
                  showVerdict ? ui.iconChip : "bg-white/20 ring-white/30"
                }`}
              >
                {showVerdict ? <ui.Icon className="h-9 w-9" strokeWidth={3} /> : <span className="text-3xl">?</span>}
              </span>
              <p className="min-w-0 font-display text-[1.75rem] font-bold leading-tight sm:text-3xl">
                {showVerdict ? ui.word : "Add your food"}
              </p>
            </div>
            <p className="relative mt-4 text-base font-semibold leading-snug">{result.headline}</p>

            {/* Carbs leads calories, same order as the search card and the
                blue card: the number that matters for insulin dosing. */}
            {showVerdict && totals.carbG > 0 && (
              <div className="relative mt-5">
                <div className="grid grid-cols-2 gap-2.5">
                  <p className="flex items-center gap-3 rounded-2xl bg-white/25 px-4 py-3 ring-1 ring-inset ring-white/35 backdrop-blur-sm">
                    <Wheat aria-hidden className="h-5 w-5 shrink-0 opacity-70" strokeWidth={2} />
                    <span>
                      <span className="block font-display text-2xl font-bold leading-none">{totals.carbG}g</span>
                      <span className="mt-1 block text-xs font-semibold opacity-80"> carbs</span>
                    </span>
                  </p>
                  {totals.calories > 0 && (
                    <p className="flex items-center gap-3 rounded-2xl bg-white/25 px-4 py-3 ring-1 ring-inset ring-white/35 backdrop-blur-sm">
                      <Flame aria-hidden className="h-5 w-5 shrink-0 opacity-70" strokeWidth={2} />
                      <span>
                        <span className="block font-display text-2xl font-bold leading-none">{totals.calories}</span>
                        <span className="mt-1 block text-xs font-semibold opacity-80"> kcal</span>
                      </span>
                    </p>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium opacity-80">For the right size of each food, shown below.</p>
              </div>
            )}
          </div>

          <div className="answer-rise space-y-5 p-5 sm:p-6">
            {/* Warns before a rule is broken, e.g. a second fast-sugar meal today. */}
            <div className="empty:hidden">
              {showVerdict && (
                <IntakeWarning key={items.map((i) => i.food.id).join()} verdict={result.verdict} />
              )}
            </div>

            {/* What this person's own meter said the last time they ate one of
                these. No "make this meal better" button here: they are already
                in the builder, and the plate in front of them is the lever. */}
            {showVerdict && (
              <div className="empty:hidden">
                <ReadingRecall key={items.map((i) => i.food.id).join()} foods={items.map((i) => i.food)} />
              </div>
            )}

            {/* Why: the engine's own lines, as a joined path. */}
            {result.breakdown.length > 0 && (
              <ul className="space-y-0 text-[15px] leading-relaxed text-ink">
                {result.breakdown.map((b, idx) => (
                  <li key={idx} className="relative flex gap-3.5 pb-3.5 last:pb-0">
                    {idx < result.breakdown.length - 1 && (
                      <span aria-hidden className="absolute bottom-0 left-[5px] top-[20px] w-0.5 rounded-full bg-line" />
                    )}
                    <span aria-hidden className="relative mt-[8px] h-3 w-3 shrink-0 rounded-full border-[3px] border-brand bg-white" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {result.fixes.length > 0 ? (
              <section className="rounded-3xl bg-mint/70 p-4 ring-1 ring-inset ring-leaf/20 sm:p-5">
                <p className="flex items-center gap-2.5 font-display text-base font-bold text-leaf-deep">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf text-white shadow-[0_6px_14px_-6px_rgba(62,155,79,0.9)]">
                    <Sparkles className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  </span>
                  Do this to make it green:
                </p>
                <ol className="mt-3.5 space-y-2">
                  {(() => {
                    let step = 0;
                    return result.fixes.map((f, idx) => {
                      // A "Note:" line is a health warning, not a step. Show it
                      // in red and skip the numbering so the steps stay in order.
                      if (f.startsWith("Note:")) {
                        return (
                          <li
                            key={idx}
                            className="flex gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-sm font-medium text-verdict-red ring-1 ring-inset ring-verdict-red/25"
                          >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden />
                            <span>{f}</span>
                          </li>
                        );
                      }
                      step += 1;
                      return (
                        <li key={idx} className="flex gap-3 rounded-2xl bg-white px-3.5 py-3 text-sm text-ink shadow-[0_4px_14px_-10px_rgba(12,42,71,0.4)]">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-bold text-white">
                            {step}
                          </span>
                          <span className="pt-0.5">{f}</span>
                        </li>
                      );
                    });
                  })()}
                </ol>
              </section>
            ) : showVerdict && result.verdict === "green" ? (
              <div className="green-burst flex items-center gap-3 rounded-3xl bg-mint/70 p-4 ring-1 ring-inset ring-verdict-green/25">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf text-white shadow-[0_6px_14px_-6px_rgba(62,155,79,0.9)]">
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>
                <p className="text-sm font-semibold text-ink">Nothing to change. This is a good meal for your sugar.</p>
              </div>
            ) : null}

            {/* Health notes of every food on the plate (red/organ meat, salty,
                oily), so build-a-meal warns the same as search. */}
            {showVerdict && healthNotes.length > 0 && (
              <div className="space-y-2">
                {healthNotes.map((n, idx) => (
                  <div key={idx} className="flex gap-3 rounded-2xl bg-verdict-red/[0.07] p-3.5 ring-1 ring-inset ring-verdict-red/20">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-verdict-red text-white">
                      <AlertTriangle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-verdict-red">Please note</p>
                      <p className="mt-0.5 text-sm text-ink">{n}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calm and grey, never red: when to take a tablet, not to stop
                eating the food. See lib/types.ts. */}
            {showVerdict && medicationNote && (
              <div className="flex items-start gap-3 rounded-2xl bg-mist p-3.5 ring-1 ring-inset ring-line">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-ink/60 shadow-sm">
                  <Pill className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <p className="pt-1 text-sm text-ink">{medicationNote}</p>
              </div>
            )}
            {showVerdict && medicineNotes.length > 0 && (
              <div className="space-y-2">
                {medicineNotes.map((n, idx) => (
                  <div key={idx} className="flex gap-3 rounded-2xl bg-mist p-3.5 ring-1 ring-inset ring-line">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-ink/60 shadow-sm">
                      <Pill className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">If you take medicine</p>
                      <p className="mt-0.5 text-sm text-ink">{n}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showVerdict && (
              <section>
                <p className="flex items-center gap-2.5 font-display text-base font-bold text-ink">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
                    <Scale className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  </span>
                  How much of each to eat
                </p>
                <div className="mt-3 space-y-2.5">
                  {items.map((i) => (
                    <PortionMini key={i.food.id} food={i.food} />
                  ))}
                </div>
              </section>
            )}

            {showVerdict && often && (
              <section className="flex gap-3.5 rounded-3xl bg-brand/[0.06] p-4 ring-1 ring-inset ring-brand/15">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <CalendarDays className="h-5 w-5" strokeWidth={2.2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand">How often</p>
                  <p className="mt-1 font-display text-lg font-bold leading-snug text-brand-deep">{often.text}</p>
                  {often.reason && <p className="mt-1 text-sm text-ink-soft">{often.reason}</p>}
                </div>
              </section>
            )}

            {showVerdict && (
              <div className="space-y-2.5 border-t border-line pt-5">
                {ate ? (
                  <span className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-verdict-green/50 bg-verdict-green/10 px-5 py-4 text-sm font-bold text-leaf-deep">
                    <Check className="h-4 w-4" strokeWidth={3} /> Added to your food
                  </span>
                ) : (
                  <button
                    onClick={logEaten}
                    className="cta-pulse flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-leaf to-leaf-deep px-5 py-4 text-base font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Utensils className="h-5 w-5" /> I ate this meal
                    <span aria-hidden className="tap-bob ml-1">
                      <Pointer className="h-5 w-5" strokeWidth={2.4} />
                    </span>
                  </button>
                )}
                <StartMealSheet
                  open={sheetOpen}
                  onClose={() => setSheetOpen(false)}
                  items={items.map((i) => ({
                    food: i.food,
                    // The sheet asks "Less / Same / More than the GluFloat
                    // size". A GluFloat-size starch is scored "half" here, but
                    // it IS the GluFloat size, so it starts on "Same".
                    portion: "normal",
                    // Keep the blue card's bigger serving instead of "normal".
                    grams: suggested?.scaledGrams[i.food.id],
                    calories: suggested?.scaledKcal[i.food.id],
                  }))}
                  kind="meal"
                  label={mealLabel}
                  verdict={result.verdict}
                  onLogged={onLogged}
                />
                <ShareOnWhatsApp text={mealShareMessage(items, result, often)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
