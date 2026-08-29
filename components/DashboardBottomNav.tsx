"use client";

import type { ReactNode } from "react";

export interface DashboardTabDef {
  id: string;
  label: string;
  /**
   * Short (one word, occasionally two) form shown under the icon — there is
   * no room for the full label in a fixed horizontal bar. Falls back to the
   * first word of `label` if omitted.
   */
  shortLabel?: string;
  icon: ReactNode;
}

/**
 * The ONE dashboard nav, at every screen size: a horizontal bar fixed to the
 * BOTTOM of the screen (founder instruction, 2026-08-29, replacing the
 * earlier left-side vertical rail after direct feedback against a stacked
 * icon column — "the icons should no longer be vertical"). Every icon
 * carries its own short label underneath at all times; there is no
 * collapse/expand state and no overlay to manage, which is what made the
 * old sidebar's "Hide/Show" toggle unnecessary here.
 *
 * Only ONE tab is ever active at a time, and `app/app/page.tsx` shows only
 * that tab's panel (everything else stays mounted but `hidden`) — this bar
 * only decides which one, it never shows more than one panel itself.
 */
export default function DashboardBottomNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: DashboardTabDef[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_28px_-16px_rgba(12,42,71,0.22)] backdrop-blur"
      aria-label="Dashboard sections"
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={isActive}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-center transition-colors ${
                isActive ? "text-brand" : "text-ink-soft"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors ${
                  isActive ? "bg-brand text-white ring-brand" : "bg-mist text-ink-soft ring-line"
                }`}
              >
                {t.icon}
              </span>
              <span className="w-full truncate text-[10.5px] font-semibold leading-tight">
                {t.shortLabel ?? t.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
