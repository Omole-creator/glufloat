import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "green" | "amber" | "red";

const TONE: Record<Tone, string> = {
  blue: "bg-brand/10 text-brand",
  green: "bg-leaf/10 text-leaf-deep",
  amber: "bg-verdict-yellow/20 text-ink",
  red: "bg-verdict-red/10 text-verdict-red",
};

/**
 * The one stat card for every admin screen: white, a hairline border, a small
 * uppercase label, one big number, and an optional line under it.
 */
export default function AdminTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#e3e9f1] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE[tone]}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
        )}
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold leading-none sm:text-3xl text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}
