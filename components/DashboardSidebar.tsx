"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { DashboardNavItems, type DashboardTabDef } from "./DashboardNavItems";

export type { DashboardTabDef };

const SIDEBAR_OPEN_KEY = "gf_sidebar_open";

/**
 * The desktop dashboard nav: a real left sidebar, collapsible to an
 * icon-only rail, so /app reads as a dashboard on a wide screen instead of
 * one long scroll. This is purely additive alongside the existing
 * DashboardNav: both drive the exact same `activeTab` state from
 * app/app/page.tsx, and both render rows via the shared DashboardNavItems,
 * so mobile and desktop share one visual identity. Hidden below `md` — the
 * phone gets its own DashboardNav using the same rows in a plain card.
 */
export default function DashboardSidebar({
  tabs,
  active,
  onSelect,
}: {
  tabs: DashboardTabDef[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
      if (saved !== null) setOpen(saved === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setOpen((cur) => {
      const next = !cur;
      try {
        localStorage.setItem(SIDEBAR_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <aside
      className={`sticky top-24 hidden max-h-[calc(100vh-7rem)] shrink-0 flex-col self-start overflow-y-auto rounded-3xl bg-white p-3 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.05] transition-[width] duration-300 ease-out md:flex ${
        open ? "w-64" : "w-[76px]"
      }`}
    >
      <Link
        href="/app"
        className="mb-4 flex items-center gap-2.5 rounded-2xl px-2 py-2 transition-colors hover:bg-mist"
      >
        <Image src="/logo-mark.png" alt="Glufloat" width={32} height={32} />
        {open && (
          <span className="truncate font-display text-base font-bold tracking-tight">
            <span className="text-brand">GLU</span>
            <span className="text-leaf">FLOAT</span>
          </span>
        )}
      </Link>

      <nav className="flex-1">
        <DashboardNavItems tabs={tabs} active={active} onSelect={onSelect} compact={!open} />
      </nav>

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Collapse the sidebar" : "Expand the sidebar"}
        className="mt-2 flex h-11 w-full items-center gap-3 rounded-xl px-2.5 text-ink-soft/70 transition-colors hover:bg-mist hover:text-ink"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          {open ? (
            <ChevronsLeft className="h-4.5 w-4.5" />
          ) : (
            <ChevronsRight className="h-4.5 w-4.5" />
          )}
        </span>
        {open && <span className="text-sm font-semibold">Hide</span>}
      </button>
    </aside>
  );
}
