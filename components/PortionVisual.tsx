import type { Food } from "@/lib/types";
import { portionVisual, type PortionKey } from "@/lib/portionVisual";

const BLUE = "#1b5faa";
const GREEN = "#3e9b4f";
const RED = "#e74c3c";
const MINT = "#eaf7ec";
const WATER = "#2c7be5";

/** A simple, clear drawing of the real-world size for each portion. */
function Icon({ k }: { k: PortionKey }) {
  const s = { stroke: BLUE, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (k) {
    case "fist":
      // A closed fist seen from the back: knuckle creases and a thumb.
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M30 46c0-6 5-10 11-10h14c7 0 11 4 11 10v14c0 6-5 10-11 10H41c-6 0-11-4-11-10z" fill={MINT} {...s} />
          <path d="M39 37v10M48 36v11M57 37v10" fill="none" stroke={BLUE} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M30 52c-6 1-7 8-1 10" fill="none" {...s} />
        </svg>
      );
    case "half-cup":
    case "three-quarter-cup":
    case "cup": {
      // A straight-sided measuring cup, not a tea mug: this is a measure of
      // food (rice, beans, salad) as often as it is a measure of drink.
      const fill = k === "cup" ? 32 : k === "three-quarter-cup" ? 41 : 52;
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <rect x="30" y="28" width="34" height="46" rx="4" fill="#fff" {...s} />
          <rect x="32" y={fill} width="30" height={72 - fill} rx="2" fill={GREEN} opacity={0.45} stroke="none" />
          <path d="M64 36c9 0 9 14 0 14" fill="none" {...s} />
          <path d="M36 40h6M36 52h6M36 64h6" stroke={BLUE} strokeWidth={2} opacity={0.45} strokeLinecap="round" />
        </svg>
      );
    }
    case "bowl":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <ellipse cx="48" cy="46" rx="26" ry="7" fill="#fff" {...s} />
          <path d="M22 46c0 15 12 24 26 24s26-9 26-24" fill={MINT} {...s} />
          <path d="M34 44c4 3 24 3 28 0" stroke={GREEN} strokeWidth={3} fill="none" strokeLinecap="round" />
        </svg>
      );
    case "cards":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <rect x="28" y="34" width="30" height="42" rx="4" fill="#fff" {...s} />
          <rect x="38" y="28" width="30" height="42" rx="4" fill={MINT} {...s} />
          <path d="M53 40l4 6-4 6-4-6z" fill={GREEN} stroke="none" />
        </svg>
      );
    case "handful":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M24 50c0 13 11 20 24 20s24-7 24-20c0-4-4-5-7-3-5-9-33-9-38 0-3-2-7-1-7 3z" fill={MINT} {...s} />
          <circle cx="41" cy="47" r="3.5" fill={GREEN} /><circle cx="50" cy="45" r="3.5" fill={GREEN} /><circle cx="58" cy="48" r="3.5" fill={GREEN} />
        </svg>
      );
    case "matchbox":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <rect x="24" y="40" width="28" height="18" rx="2" fill="#fff" {...s} />
          <rect x="46" y="48" width="28" height="18" rx="2" fill={MINT} {...s} />
        </svg>
      );
    case "slice":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M30 46c0-9 8-14 18-14s18 5 18 14v18a5 5 0 0 1-5 5H35a5 5 0 0 1-5-5z" fill={MINT} {...s} />
        </svg>
      );
    case "half-fruit":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M48 30c-13 0-20 10-20 22s9 22 20 22z" fill={MINT} {...s} />
          <path d="M48 30v44" {...s} />
          <circle cx="41" cy="52" r="6" fill={GREEN} stroke="none" />
        </svg>
      );
    case "whole-fruit":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <circle cx="48" cy="54" r="20" fill={MINT} {...s} />
          <path d="M48 34c1-6 7-7 10-5" stroke={GREEN} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M48 34c-3-4-9-4-12-2 2 5 8 6 12 2z" fill={GREEN} stroke="none" />
        </svg>
      );
    case "berries":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M48 30c2-5 7-6 10-4" stroke={GREEN} strokeWidth={3} fill="none" strokeLinecap="round" />
          <circle cx="40" cy="46" r="9" fill={MINT} {...s} />
          <circle cx="57" cy="46" r="9" fill={MINT} {...s} />
          <circle cx="48" cy="60" r="9" fill={MINT} {...s} />
        </svg>
      );
    case "pieces":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <ellipse cx="40" cy="52" rx="9" ry="16" fill={MINT} {...s} transform="rotate(-18 40 52)" />
          <ellipse cx="58" cy="50" rx="9" ry="16" fill={MINT} {...s} transform="rotate(12 58 50)" />
        </svg>
      );
    case "glass":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M34 30h28l-3 40a5 5 0 0 1-5 4H42a5 5 0 0 1-5-4z" fill="#fff" {...s} />
          <path d="M36 50h24l-2 20a5 5 0 0 1-5 4H43a5 5 0 0 1-5-4z" fill={WATER} opacity={0.35} stroke="none" />
        </svg>
      );
    case "spoon":
      // Upright, so it does not read as a magnifying glass.
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <ellipse cx="48" cy="36" rx="12" ry="15" fill={MINT} {...s} />
          <path d="M48 51v25" stroke={BLUE} strokeWidth={5} fill="none" strokeLinecap="round" />
        </svg>
      );
    case "eggs":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <ellipse cx="40" cy="55" rx="10" ry="14" fill="#fff" {...s} />
          <ellipse cx="57" cy="48" rx="10" ry="14" fill={MINT} {...s} />
        </svg>
      );
    case "cob":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <rect x="40" y="26" width="16" height="44" rx="8" fill="#f1c40f" {...s} />
          <path d="M46 34v28M50 34v28" stroke={GREEN} strokeWidth={2} opacity={0.5} />
        </svg>
      );
    case "palm":
      // An open hand, palm towards you: the wrap sits in it.
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M32 48c0-4 3-7 7-7h18c4 0 7 3 7 7v12c0 8-6 14-14 14h-4c-8 0-14-6-14-14z" fill={MINT} {...s} />
          <path d="M36 41V30M44 41V26M52 41V26M60 41V30" fill="none" {...s} />
          <path d="M32 52c-5 0-7-6-3-8" fill="none" {...s} />
        </svg>
      );
    case "plantain": {
      // A fat crescent: two stacked strokes give an outlined banana shape.
      const curve = "M32 28c0 24 16 40 40 42";
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d={curve} stroke={BLUE} strokeWidth={18} fill="none" strokeLinecap="round" />
          <path d={curve} stroke={MINT} strokeWidth={12} fill="none" strokeLinecap="round" />
          <path d="M32 28v-6" stroke={BLUE} strokeWidth={3} fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    case "pinch":
      // Thumb and finger taking a pinch, with the grains falling below.
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <path d="M34 26c5 8 9 14 13 20" fill="none" stroke={BLUE} strokeWidth={7} strokeLinecap="round" />
          <path d="M62 26c-5 8-9 14-13 20" fill="none" stroke={BLUE} strokeWidth={7} strokeLinecap="round" />
          <circle cx="48" cy="58" r="3" fill={GREEN} />
          <circle cx="42" cy="68" r="3" fill={GREEN} />
          <circle cx="54" cy="70" r="3" fill={GREEN} />
        </svg>
      );
    case "sticks":
      // Two raw sticks, one with a leafy top.
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <rect x="34" y="32" width="12" height="40" rx="6" fill={MINT} {...s} />
          <rect x="52" y="38" width="12" height="34" rx="6" fill={MINT} {...s} />
          <path d="M40 32c-1-6-6-8-9-7 1 5 5 8 9 7z" fill={GREEN} stroke="none" />
        </svg>
      );
    case "avoid":
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <circle cx="48" cy="50" r="20" fill="#fff" stroke={RED} strokeWidth={4} />
          <path d="M35 37l26 26" stroke={RED} strokeWidth={4} strokeLinecap="round" />
        </svg>
      );
    case "free":
      // A plain green tick: yes, as much as you like.
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <circle cx="48" cy="50" r="20" fill="#fff" stroke={GREEN} strokeWidth={3} />
          <path d="M38 50l7 8 14-16" stroke={GREEN} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 96 96" aria-hidden>
          <circle cx="48" cy="52" r="20" fill={MINT} {...s} />
          <circle cx="48" cy="52" r="10" fill="#fff" stroke={BLUE} strokeWidth={2} />
        </svg>
      );
  }
}

/** Full-width portion guide: the picture + the clear "how much" text. */
export default function PortionVisual({ food }: { food: Food }) {
  const { key } = portionVisual(food);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-mist p-3">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
        <span className="h-12 w-12">
          <Icon k={key} />
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
          How much to eat
        </p>
        <p className="mt-0.5 text-sm font-medium text-ink">
          {food.portionGuidance}
        </p>
      </div>
    </div>
  );
}

/** Compact chip used in the meal builder (icon + the food + the clear amount). */
export function PortionMini({ food }: { food: Food }) {
  const { key } = portionVisual(food);
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
        <span className="h-8 w-8">
          <Icon k={key} />
        </span>
      </span>
      <div className="min-w-0 text-xs">
        <p className="font-semibold text-ink">{food.name}</p>
        <p className="text-ink-soft">{food.portionGuidance}</p>
      </div>
    </div>
  );
}
