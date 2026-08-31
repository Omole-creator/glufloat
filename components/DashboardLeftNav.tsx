"use client";

import type { DashboardTabDef } from "./DashboardBottomNav";

/**
 * The desktop (`md:` and up) counterpart to `DashboardBottomNav.tsx` —
 * founder instruction: move the nav to the LEFT side of the screen on
 * desktop, while the mobile bottom bar stays exactly as it is. The two
 * components are siblings, each shown only at its own breakpoint by
 * `app/app/page.tsx` (`md:hidden` / `hidden md:block`); this file makes no
 * changes to `DashboardBottomNav.tsx` itself, so mobile rendering is
 * unaffected by this file's existence.
 *
 * Deliberately simple: a sticky, always-expanded column with full labels
 * (desktop has room, unlike the bottom bar's short labels). No collapse
 * toggle and no logo header — an earlier, more elaborate left sidebar with
 * both was removed in 2026-08-29 for being over-built; this is not a
 * reintroduction of that, only the founder's specific ask.
 */
export default function DashboardLeftNav({
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
      aria-label="Dashboard sections"
      className="sticky top-24 w-56 shrink-0 space-y-1 rounded-3xl border border-line bg-white p-3 shadow-[0_10px_28px_-16px_rgba(12,42,71,0.15)]"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={isActive}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
              isActive ? "bg-brand/10 text-brand" : "text-ink-soft hover:bg-mist"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors ${
                isActive ? "bg-brand text-white ring-brand" : "bg-mist text-ink-soft ring-line"
              }`}
            >
              {t.icon}
            </span>
            <span className="truncate">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
