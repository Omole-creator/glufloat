"use client";

import { useEffect, useState } from "react";
import type { Food } from "@/lib/types";
import { plainFrequency } from "@/lib/frequency";
import { cleanFoodName } from "@/lib/foodName";
import { foodShareMessage } from "@/lib/shareMessage";
import { isCrossGroupSwap, kunuSweetenTips, nextSwallowSwapTurn, saferSwaps } from "@/lib/variety";
import PortionVisual from "./PortionVisual";
import ShareOnWhatsApp from "./ShareOnWhatsApp";
import IntakeWarning from "./IntakeWarning";
import ReadingRecall from "./ReadingRecall";
import FoodIcon from "./FoodIcon";
import { AlertTriangle, ArrowRight, CalendarDays, Flame, Pill, Sparkles, Utensils, Wheat } from "lucide-react";

// The band is the one place the traffic light fills a surface. Yellow is a
// light colour, so it carries dark text; green and red carry white.
const STYLES = {
  green: {
    ring: "ring-verdict-green/40",
    band: "bg-gradient-to-br from-verdict-green to-leaf text-white",
    chip: "bg-white/25 text-white ring-white/40",
    label: "Green. Good to eat.",
  },
  yellow: {
    ring: "ring-verdict-yellow/60",
    band: "bg-gradient-to-br from-verdict-yellow to-[#f5d34a] text-ink",
    chip: "bg-white/50 text-ink ring-white/70",
    label: "Yellow. Eat with care.",
  },
  red: {
    ring: "ring-verdict-red/40",
    band: "bg-gradient-to-br from-verdict-red to-[#c0392b] text-white",
    chip: "bg-white/25 text-white ring-white/40",
    label: "Red. Better to skip.",
  },
} as const;

export default function VerdictCard({
  food,
  onFix,
  onSwap,
}: {
  food: Food;
  /** Opens the meal builder with this food in it, for the readings note below. */
  onFix?: () => void;
  /** Opens the suggested swap's own card, in place of this one. */
  onSwap?: (food: Food) => void;
}) {
  const s = STYLES[food.baseVerdict];
  // The exchange-list move a dietitian makes in the room: not green, so offer
  // the closest real same-group food that already is, rather than only
  // explaining why this one is not. Green foods need no swap.
  // A swallow's swap takes turns among the slower swallows, one per look
  // (founder, 2026-10-12). Read after mount: it is a device counter.
  const [swapTurn, setSwapTurn] = useState(0);
  useEffect(() => {
    if (food.category === "swallow") setSwapTurn(nextSwallowSwapTurn());
  }, [food.id, food.category]);
  const swap =
    food.baseVerdict !== "green" ? saferSwaps(food, 1, swapTurn)[0] : undefined;
  // Kunu gets fruit to sweeten it instead of a zobo swap (dietitian, 2026-10-12).
  const sweeten = food.baseVerdict !== "green" ? kunuSweetenTips(food) : [];

  return (
    /* Redesigned 2026-10-25 with the same words, in the same look as the
       "Check a meal" answer: the band holds the name, the verdict and the two
       numbers; every section below has an icon chip and a quiet label. */
    <div
      className={`verdict-pop overflow-hidden rounded-[28px] bg-white text-left shadow-[0_28px_70px_-30px_rgba(12,42,71,0.5)] ring-1 ${s.ring}`}
    >
      {/* The colour band: the food's name, its plain verdict and its numbers. */}
      <div className={`relative overflow-hidden px-5 pb-5 pt-5 sm:px-6 ${s.band}`}>
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex items-center gap-3.5">
          <FoodIcon food={food} tone="band" size="lg" />
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold leading-tight sm:text-2xl">
              {cleanFoodName(food.name)}
            </h3>
            <span className={`mt-1.5 inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide ring-1 ${s.chip}`}>
              {s.label}
            </span>
          </div>
        </div>

        {/* Carbs leads calories, same order as the blue card: the number that
            matters for insulin dosing (carb counting). */}
        {(food.carbG ?? 0) > 0 && (
          <div className="relative mt-5 grid grid-cols-2 gap-2.5">
            <p className="flex items-center gap-3 rounded-2xl bg-white/25 px-4 py-3 ring-1 ring-inset ring-white/35">
              <Wheat aria-hidden className="h-5 w-5 shrink-0 opacity-70" strokeWidth={2} />
              <span>
                <span className="block font-display text-2xl font-bold leading-none">{food.carbG}g</span>
                <span className="mt-1 block text-xs font-semibold opacity-80"> carbs</span>
              </span>
            </p>
            {(food.calories ?? 0) > 0 && (
              <p className="flex items-center gap-3 rounded-2xl bg-white/25 px-4 py-3 ring-1 ring-inset ring-white/35">
                <Flame aria-hidden className="h-5 w-5 shrink-0 opacity-70" strokeWidth={2} />
                <span>
                  <span className="block font-display text-2xl font-bold leading-none">{food.calories}</span>
                  <span className="mt-1 block text-xs font-semibold opacity-80"> kcal</span>
                </span>
              </p>
            )}
          </div>
        )}
        {/* Soups are counted from a standard recipe without the meat or fish
            (founder, 2026-10-24); the plate counts its fish or meat once. */}
        {food.nutritionSource === "recipe" && (
          <p className="relative mt-2 text-xs font-medium leading-relaxed opacity-85">
            This is for the soup only. Your fish or meat is not added here.
          </p>
        )}
      </div>

      <div className="answer-rise space-y-4 p-5 sm:p-6">
        {/* Warns before a rule is broken, e.g. a second fast-sugar food today. */}
        <div className="empty:hidden">
          <IntakeWarning key={food.id} verdict={food.baseVerdict} />
        </div>

        <p className="text-[15px] leading-relaxed text-ink">{food.logicNote}</p>

        {/* What happened to THIS person the last time they ate it. Straight under
            the verdict, because their own body outranks anything we can say in
            general. */}
        <div className="empty:hidden">
          <ReadingRecall key={food.id} foods={[food]} onFix={onFix} />
        </div>

        {food.healthNote && (
          <div className="flex gap-3 rounded-2xl bg-verdict-red/[0.07] p-3.5 ring-1 ring-inset ring-verdict-red/20">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-verdict-red text-white">
              <AlertTriangle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-verdict-red">Please note</p>
              <p className="mt-0.5 text-sm text-ink">{food.healthNote}</p>
            </div>
          </div>
        )}

        {/* Calm on purpose. This tells you when to take your tablet, not to stop
            eating the food, so it must never be dressed up as a red warning. */}
        {food.medicineNote && (
          <div className="flex gap-3 rounded-2xl bg-mist p-3.5 ring-1 ring-inset ring-line">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-ink/60 shadow-sm">
              <Pill className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">If you take medicine</p>
              <p className="mt-0.5 text-sm text-ink">{food.medicineNote}</p>
            </div>
          </div>
        )}

        {swap && (
          <div className="rounded-3xl bg-mint/70 p-4 ring-1 ring-inset ring-leaf/20">
            <p className="flex items-center gap-2.5 font-display text-base font-bold text-leaf-deep">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf text-white">
                <Sparkles className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </span>
              Try this instead
            </p>
            <p className="mt-2.5 text-sm text-ink">
              {isCrossGroupSwap(food, swap)
                ? `${cleanFoodName(swap.name)} is a better snack. It will not push your sugar up as fast.`
                : `${cleanFoodName(swap.name)} is in the same food group and will not push your sugar up as fast.`}
            </p>
            {onSwap && <SeeButton name={cleanFoodName(swap.name)} onClick={() => onSwap(swap)} />}
          </div>
        )}

        {sweeten.length > 0 && (
          <div className="rounded-3xl bg-mint/70 p-4 ring-1 ring-inset ring-leaf/20">
            <p className="flex items-center gap-2.5 font-display text-base font-bold text-leaf-deep">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf text-white">
                <Sparkles className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </span>
              Try this instead
            </p>
            {sweeten.map((t) => (
              <div key={t.fruit.id} className="mt-2.5">
                <p className="text-sm text-ink">{t.text}</p>
                {onSwap && <SeeButton name={cleanFoodName(t.fruit.name)} onClick={() => onSwap(t.fruit)} />}
              </div>
            ))}
          </div>
        )}

        <PortionVisual food={food} />

        {food.carbExchange && (
          <div className="rounded-2xl bg-mist p-3.5 ring-1 ring-inset ring-line">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
              One fruit serving (15g carbs)
            </p>
            <p className="mt-1 text-sm text-ink">
              About {food.carbExchange}. Two servings at once raises your sugar
              more.
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl ring-1 ring-line">
          <div className="flex gap-3.5 bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Utensils className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Eat it with</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                {food.pairingAdvice || "Nothing can make this one safe."}
              </p>
            </div>
          </div>
          <div className="flex gap-3.5 border-t border-brand/10 bg-brand/[0.06] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <CalendarDays className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand">How often</p>
              <p className="mt-1 font-display text-base font-bold leading-snug text-brand-deep">{plainFrequency(food)}</p>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <ShareOnWhatsApp text={foodShareMessage(food)} />
        </div>
      </div>
    </div>
  );
}

/** "See X": opens the suggested food's own card. */
function SeeButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-between gap-2 rounded-2xl bg-white py-1.5 pl-4 pr-1.5 text-left text-sm font-bold text-leaf-deep shadow-[0_8px_20px_-12px_rgba(44,122,60,0.8)] ring-1 ring-leaf/20 transition-transform hover:-translate-y-0.5"
    >
      See {name}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf text-white">
        <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}
