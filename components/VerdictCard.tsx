import type { Food } from "@/lib/types";
import { plainFrequency } from "@/lib/frequency";
import { cleanFoodName } from "@/lib/foodName";
import { foodShareMessage } from "@/lib/shareMessage";
import { isCrossGroupSwap, saferSwaps } from "@/lib/variety";
import PortionVisual from "./PortionVisual";
import ShareOnWhatsApp from "./ShareOnWhatsApp";
import IntakeWarning from "./IntakeWarning";
import ReadingRecall from "./ReadingRecall";
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
  const swap =
    food.baseVerdict !== "green" ? saferSwaps(food, 1)[0] : undefined;

  return (
    <div
      className={`verdict-pop overflow-hidden rounded-3xl bg-white text-left shadow-[0_24px_60px_-28px_rgba(12,42,71,0.45)] ring-1 ${s.ring}`}
    >
      {/* The colour band: the food's name and its plain verdict. */}
      <div className={`relative overflow-hidden px-5 py-5 ${s.band}`}>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl"
        />
        <h3 className="relative font-display text-xl font-semibold leading-tight">
          {cleanFoodName(food.name)}
        </h3>
        <span
          className={`relative mt-2.5 inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide ring-1 ${s.chip}`}
        >
          {s.label}
        </span>
      </div>

      <div className="answer-rise space-y-3 p-5">
        {/* Warns before a rule is broken, e.g. a second fast-sugar food today. */}
        <div className="empty:hidden">
          <IntakeWarning key={food.id} verdict={food.baseVerdict} />
        </div>

        {/* Carbs leads calories, same order as TodaysMeal's pills — this is
            the number that matters for insulin dosing (carb counting). */}
        {(food.carbG ?? 0) > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            <p className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-deep px-4 py-3 text-white shadow-[0_10px_24px_-14px_rgba(27,95,170,0.9)]">
              <Wheat aria-hidden className="absolute -bottom-2 -right-2 h-14 w-14 text-white/15" strokeWidth={1.8} />
              <span className="block font-display text-2xl font-bold leading-none">{food.carbG}g</span>
              <span className="mt-1 block text-xs font-semibold text-white/85"> carbs</span>
            </p>
            {(food.calories ?? 0) > 0 && (
              <p className="relative overflow-hidden rounded-2xl bg-brand/[0.07] px-4 py-3 text-brand-deep ring-1 ring-inset ring-brand/15">
                <Flame aria-hidden className="absolute -bottom-2 -right-2 h-14 w-14 text-brand/10" strokeWidth={1.8} />
                <span className="block font-display text-2xl font-bold leading-none">{food.calories}</span>
                <span className="mt-1 block text-xs font-semibold text-brand-deep/75"> kcal</span>
              </p>
            )}
          </div>
        )}

        <p className="text-sm leading-relaxed text-ink-soft">
          {food.logicNote}
        </p>

        {/* What happened to THIS person the last time they ate it. Straight under
            the verdict, because their own body outranks anything we can say in
            general. */}
        <div className="empty:hidden">
          <ReadingRecall key={food.id} foods={[food]} onFix={onFix} />
        </div>

        {food.healthNote && (
          <div className="rounded-2xl border-l-4 border-verdict-red bg-verdict-red/[0.08] p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-verdict-red">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden />
              Please note
            </p>
            <p className="mt-1 text-sm text-ink">{food.healthNote}</p>
          </div>
        )}

        {/* Calm on purpose. This tells you when to take your tablet, not to stop
            eating the food, so it must never be dressed up as a red warning. */}
        {food.medicineNote && (
          <div className="rounded-2xl bg-mist p-3.5 ring-1 ring-inset ring-line">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/60">
              <Pill className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              If you take medicine
            </p>
            <p className="mt-1 text-sm text-ink">{food.medicineNote}</p>
          </div>
        )}

        {swap && (
          <div className="rounded-2xl bg-gradient-to-br from-mint to-verdict-green/10 p-3.5 ring-1 ring-inset ring-verdict-green/30">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-leaf-deep">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              Try this instead
            </p>
            <p className="mt-1 text-sm text-ink">
              {isCrossGroupSwap(food, swap)
                ? `${cleanFoodName(swap.name)} is a better snack. It will not push your sugar up as fast.`
                : `${cleanFoodName(swap.name)} is in the same food group and will not push your sugar up as fast.`}
            </p>
            {onSwap && (
              <button
                onClick={() => onSwap(swap)}
                className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(44,122,60,0.95)] transition-transform hover:-translate-y-0.5"
              >
                See {cleanFoodName(swap.name)}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
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

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-3.5 shadow-[0_6px_20px_-12px_rgba(12,42,71,0.35)] ring-1 ring-brand/10">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10">
                <Utensils className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              Eat it with
            </p>
            <p className="mt-1.5 text-sm text-ink">
              {food.pairingAdvice || "Nothing can make this one safe."}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-deep p-3.5 text-white shadow-[0_14px_30px_-16px_rgba(15,61,117,0.9)]">
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-10 -right-6 h-24 w-24 rounded-full bg-white/10 blur-xl"
            />
            <p className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/80">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              </span>
              How often
            </p>
            <p className="relative mt-1.5 text-sm font-semibold">{plainFrequency(food)}</p>
          </div>
        </div>

        <div className="pt-1">
          <ShareOnWhatsApp text={foodShareMessage(food)} />
        </div>
      </div>
    </div>
  );
}
