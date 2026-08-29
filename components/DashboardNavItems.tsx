"use client";

import type { ReactNode } from "react";

export interface DashboardTabDef {
  id: string;
  label: string;
  /**
   * Short (one word, occasionally two) form shown under the icon in the
   * compact/mobile rail, where there is no room for the full label. Falls
   * back to the first word of `label` if omitted.
   */
  shortLabel?: string;
  icon: ReactNode;
}

/**
 * The shared row: a soft-tinted icon chip plus a label — the same visual
 * language CollapsibleCard already uses elsewhere in /app (a rounded chip,
 * not a bare icon, and a tinted fill rather than a left accent bar for the
 * active state), so the nav reads as part of the same premium system instead
 * of a plainer, separately-styled control.
 *
 * Two layouts, never icon-only: `compact` (the mobile/collapsed rail) stacks
 * a short label under the chip instead of hiding it — the earlier version
 * fully omitted the label in this mode, which read as six unlabeled buttons
 * to a first-time visitor. The expanded layout keeps the label beside the
 * chip.
 */
export function DashboardNavItems({
  tabs,
  active,
  onSelect,
  compact = false,
}: {
  tabs: DashboardTabDef[];
  active: string;
  onSelect: (id: string) => void;
  /** Icon chip + a short label stacked underneath — the mobile/collapsed rail. */
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-1"}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const chip = (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors ${
              isActive
                ? "bg-brand text-white ring-brand"
                : "bg-mist text-ink-soft ring-line group-hover:bg-brand/10 group-hover:text-brand group-hover:ring-brand/20"
            }`}
          >
            {t.icon}
          </span>
        );

        if (compact) {
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={isActive}
              className={`group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors ${
                isActive ? "text-brand" : "text-ink-soft hover:bg-mist hover:text-ink"
              }`}
            >
              {chip}
              <span className="w-full truncate text-[10.5px] font-semibold leading-tight">
                {t.shortLabel ?? t.label.split(" ")[0]}
              </span>
            </button>
          );
        }

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={isActive}
            className={`group flex h-12 w-full items-center gap-3 rounded-xl px-2.5 text-left transition-colors ${
              isActive ? "bg-brand/10 text-brand" : "text-ink-soft hover:bg-mist hover:text-ink"
            }`}
          >
            {chip}
            <span className="truncate text-sm font-semibold">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
