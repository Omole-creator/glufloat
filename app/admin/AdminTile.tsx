import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "green" | "amber" | "red";

const TONE: Record<Tone, string> = {
  blue: "bg-brand/10 text-brand ring-brand/15",
  green: "bg-leaf/10 text-leaf-deep ring-leaf/15",
  amber: "bg-v-yellow/20 text-ink ring-v-yellow/30",
  red: "bg-v-red/10 text-v-red ring-v-red/20",
};

/**
 * The one stat-tile look for every admin screen — a soft-shadow white card
 * with an optional tinted icon chip, same visual language as the app's own
 * PersonalizationSettings ("Fit me") and DashboardSnapshot tiles, instead of
 * a plain hairline-bordered box.
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
    <div className="rounded-2xl bg-white p-5 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.18)] ring-1 ring-ink/[0.05]">
      <div className="flex items-center gap-2">
        {Icon && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONE[tone]}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
        )}
        <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</p>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}
