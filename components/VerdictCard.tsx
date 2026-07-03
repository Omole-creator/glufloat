import type { Food } from "@/lib/types";

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

export default function VerdictCard({ food }: { food: Food }) {
  const s = STYLES[food.baseVerdict];

  return (
    <div
      className={`verdict-pop rounded-2xl border-2 ${s.ring} bg-white p-5 text-left shadow-[0_10px_30px_-14px_rgba(12,45,77,0.25)]`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">
          {food.name}
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

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className={`rounded-xl ${s.soft} p-3`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
            How much to eat
          </p>
          <p className="mt-1 text-sm text-ink">{food.portionGuidance}</p>
        </div>
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
          <p className="mt-1 text-sm text-ink">{food.frequency}</p>
        </div>
      </div>
    </div>
  );
}
