"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { DashboardNavItems, type DashboardTabDef } from "./DashboardNavItems";
import { useIsMobile } from "./hooks/use-mobile";

export type { DashboardTabDef };

const SIDEBAR_OPEN_KEY = "gf_sidebar_open";

/**
 * The ONE dashboard nav, left side, every screen size — founder instruction:
 * the phone must behave exactly like the desktop, not fall back to a
 * different layout. On a phone there is no room to push the content aside by
 * 256px (that would leave barely 60px for everything else), so the same
 * sidebar renders as a slim icon-only rail there by default, and tapping ANY
 * icon expands it — as an overlay, not a reflow, so the content column never
 * jumps width. On a wide screen it behaves exactly as before: a real
 * collapsible column that pushes the content aside.
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);

  // Wait for isMobile to resolve before applying a screen-aware default, so
  // a phone starts compact (icon-only) and a wide screen starts expanded —
  // unless this device already has its own remembered preference.
  useEffect(() => {
    if (isMobile === undefined) return;
    try {
      const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
      setOpen(saved !== null ? saved === "1" : !isMobile);
    } catch {
      setOpen(!isMobile);
    }
  }, [isMobile]);

  const setOpenPersist = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(SIDEBAR_OPEN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // On a phone, "open" is an overlay on top of the page, not a wider column
  // — a 256px-wide in-flow sidebar would leave almost nothing for the
  // content next to it. On a wide screen "open" still just widens the
  // column in place, unchanged from before.
  const overlay = isMobile === true && open;

  // Phone-only: the first tap on a compact icon navigates AND reveals every
  // label, so someone who does not yet know what an icon means learns it
  // right away. A SECOND tap, once the overlay is already showing, is a
  // deliberate and informed choice — select it and close the drawer, or its
  // full-screen backdrop would keep blocking the very content just picked.
  // Desktop is untouched: its collapse/expand stays fully manual, via the
  // toggle below, exactly as before.
  const handleSelect = (id: string) => {
    if (isMobile) setOpenPersist(!open);
    onSelect(id);
  };

  return (
    <>
      {/* Reserves the compact rail's width in the flex row even while the
          overlay is showing, so the content column never shifts open/closed. */}
      {overlay && <div className="w-[84px] shrink-0" aria-hidden />}

      {overlay && (
        <div
          className="fixed inset-0 z-40 bg-ink/30"
          onClick={() => setOpenPersist(false)}
          aria-hidden
        />
      )}

      <aside
        className={
          overlay
            ? "fixed left-3 top-24 bottom-6 z-[41] flex w-64 flex-col overflow-y-auto rounded-3xl bg-white p-3 shadow-[0_24px_60px_-20px_rgba(12,42,71,0.5)] ring-1 ring-ink/10"
            : `sticky top-24 flex max-h-[calc(100vh-7rem)] shrink-0 flex-col self-start overflow-y-auto rounded-3xl bg-white p-3 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.05] transition-[width] duration-300 ease-out ${
                open ? "w-64" : "w-[84px]"
              }`
        }
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
          <DashboardNavItems tabs={tabs} active={active} onSelect={handleSelect} compact={!open} />
        </nav>

        <button
          type="button"
          onClick={() => setOpenPersist(!open)}
          aria-label={open ? "Collapse the sidebar" : "Expand the sidebar"}
          className={
            open
              ? "mt-2 flex h-12 w-full items-center gap-3 rounded-xl px-2.5 text-ink-soft/70 transition-colors hover:bg-mist hover:text-ink"
              : "mt-2 flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-ink-soft/70 transition-colors hover:bg-mist hover:text-ink"
          }
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist ring-1 ring-inset ring-line">
            {open ? (
              <ChevronsLeft className="h-4.5 w-4.5" />
            ) : (
              <ChevronsRight className="h-4.5 w-4.5" />
            )}
          </span>
          <span className={open ? "text-sm font-semibold" : "text-[10.5px] font-semibold leading-tight"}>
            {open ? "Hide" : "Show"}
          </span>
        </button>
      </aside>
    </>
  );
}
