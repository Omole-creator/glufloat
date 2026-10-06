import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

type Tone = "blue" | "green" | "amber" | "red";
const TONE: Record<Tone, string> = {
  blue: "bg-brand/10 text-brand",
  green: "bg-leaf/10 text-leaf-deep",
  amber: "bg-verdict-yellow/20 text-ink",
  red: "bg-verdict-red/10 text-verdict-red",
};

/**
 * A headline money number with how it moved against the period before.
 *
 * The change chip carries an arrow AND a word, never colour alone. `goodWhen`
 * says which way is good: more revenue is good, more expenses is not, so the
 * same "+12%" is green on one card and red on the other.
 */
export default function FinanceStat({
  label,
  value,
  sub,
  change,
  changeLabel,
  goodWhen = "up",
  icon: Icon,
  tone = "blue",
  emphasis = false,
  className = "",
}: {
  label: string;
  value: string;
  sub?: string;
  /** A fraction (0.12 = +12%), or null when there is nothing to compare with. */
  change?: number | null;
  /** "vs September 2026" */
  changeLabel?: string;
  goodWhen?: "up" | "down";
  icon?: LucideIcon;
  tone?: Tone;
  /** The one card the eye should land on first. */
  emphasis?: boolean;
  className?: string;
}) {
  const has = change !== undefined;
  const flat = change === null || change === undefined || Math.abs(change) < 0.005;
  const up = !flat && (change as number) > 0;
  const good = flat ? null : goodWhen === "up" ? up : !up;
  const chip = flat
    ? "bg-[#eef2f7] text-ink-soft"
    : good
      ? "bg-leaf/12 text-leaf-deep"
      : "bg-verdict-red/10 text-verdict-red";
  const Arrow = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${className} ${
        emphasis ? "border-brand bg-brand text-white" : "border-[#e3e9f1] bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              emphasis ? "bg-white/15 text-white" : TONE[tone]
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
        )}
        <p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${emphasis ? "text-white/70" : "text-ink/50"}`}>
          {label}
        </p>
      </div>
      <p className={`mt-2 whitespace-nowrap font-display text-[22px] font-bold leading-none tabular-nums sm:text-2xl xl:text-[28px] ${emphasis ? "text-white" : "text-ink"}`}>
        {value}
      </p>
      {has && (
        <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold ${
              emphasis ? "bg-white/15 text-white" : chip
            }`}
          >
            <Arrow className="h-3 w-3" strokeWidth={2.6} />
            {change === null || change === undefined
              ? "new"
              : `${change > 0 ? "+" : ""}${Math.round(change * 100)}%`}
          </span>
          {changeLabel && <span className={emphasis ? "text-white/70" : "text-ink-soft"}>{changeLabel}</span>}
        </p>
      )}
      {sub && <p className={`mt-2 text-xs ${emphasis ? "text-white/75" : "text-ink-soft"}`}>{sub}</p>}
    </div>
  );
}
