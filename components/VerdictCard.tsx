import type { Food } from "@/lib/types";
import { plainFrequency } from "@/lib/frequency";
import { cleanFoodName } from "@/lib/foodName";
import { foodShareMessage } from "@/lib/shareMessage";
import { saferSwaps } from "@/lib/variety";
import PortionVisual from "./PortionVisual";
import ShareOnWhatsApp from "./ShareOnWhatsApp";
import IntakeWarning from "./IntakeWarning";
import ReadingRecall from "./ReadingRecall";

const STYLES = {
  green: {
    ring: "border-verdict-green/40",
    chip: "bg-verdict-green text-white",
    soft: "bg-verdict-green/10",
    label: "Green. Good to eat.",
  },
  yellow: {
    ring: "border-verdict-yellow/50",
    chip: "bg-verdict-yellow text-ink",
    soft: "bg-verdict-yellow/10",
    label: "Yellow. Eat with care.",
  },
  red: {
    ring: "border-verdict-red/40",
    chip: "bg-verdict-red text-white",
    soft: "bg-verdict-red/10",
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
      className={`verdict-pop rounded-2xl border-2 ${s.ring} bg-white p-5 text-left shadow-[0_10px_30px_-14px_rgba(12,45,77,0.25)]`}
    >
      {/* Warns before a rule is broken, e.g. a second fast-sugar food today. */}
      <div className="mb-3 empty:mb-0">
        <IntakeWarning key={food.id} verdict={food.baseVerdict} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">
          {cleanFoodName(food.name)}
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${s.chip}`}
        >
          {s.label}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {food.logicNote}
      </p>

      {/* What happened to THIS person the last time they ate it. Straight under
          the verdict, because their own body outranks anything we can say in
          general. */}
      <div className="mt-3 empty:mt-0">
        <ReadingRecall key={food.id} foods={[food]} onFix={onFix} />
      </div>

      {food.healthNote && (
        <div className="mt-3 rounded-xl border border-verdict-red/40 bg-verdict-red/10 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-verdict-red">
            Please note
          </p>
          <p className="mt-1 text-sm text-ink">{food.healthNote}</p>
        </div>
      )}

      {/* Calm on purpose. This tells you when to take your tablet, not to stop
          eating the food, so it must never be dressed up as a red warning. */}
      {food.medicineNote && (
        <div className="mt-3 rounded-xl border border-line bg-mist p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
            If you take medicine
          </p>
          <p className="mt-1 text-sm text-ink">{food.medicineNote}</p>
        </div>
      )}

      {swap && (
        <div className="mt-3 rounded-xl border border-verdict-green/30 bg-verdict-green/10 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-leaf-deep">
            Try this instead
          </p>
          <p className="mt-1 text-sm text-ink">
            {cleanFoodName(swap.name)} is in the same food group and will not
            push your sugar up as fast.
          </p>
          {onSwap && (
            <button
              onClick={() => onSwap(swap)}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-verdict-green/40 bg-white px-4 py-2 text-sm font-semibold text-leaf-deep transition-colors hover:bg-verdict-green hover:text-white"
            >
              See {cleanFoodName(swap.name)}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <PortionVisual food={food} />
        {food.carbExchange && (
          <div className="rounded-xl border border-line bg-mist p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
              One fruit serving (15g carbs)
            </p>
            <p className="mt-1 text-sm text-ink">
              About {food.carbExchange}. Two servings at once raises your sugar
              more.
            </p>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className={`rounded-xl ${s.soft} p-3`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
              Eat it with
            </p>
            <p className="mt-1 text-sm text-ink">
              {food.pairingAdvice || "Nothing can make this one safe."}
            </p>
          </div>
          <div className={`rounded-xl ${s.soft} p-3`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
              How often
            </p>
            <p className="mt-1 text-sm text-ink">{plainFrequency(food)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ShareOnWhatsApp text={foodShareMessage(food)} />
      </div>
    </div>
  );
}
