"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Stethoscope,
  PenLine,
  Mail,
  ExternalLink,
  LogOut,
  LineChart,
  Receipt,
  Landmark,
  Hospital,
  Handshake,
  Wallet,
  Megaphone,
  BadgePercent,
} from "lucide-react";

/**
 * The admin screens, in four groups so the sidebar reads as a map of the
 * business rather than a flat list: how it is doing, the money, the people,
 * and what we publish. Navigation only: anything a page can DO
 * (download, pick a period) lives in the page, never here.
 *
 * `exact` screens light up only on their own address. Without it the Finance
 * tab would also light up on /admin/finance/expenses, and the Dashboard on
 * every page.
 */
const GROUPS = [
  { title: "Overview", tabs: [{ href: "/admin", label: "Dashboard", icon: BarChart3, exact: true }] },
  {
    title: "Money",
    tabs: [
      { href: "/admin/finance", label: "Finance", icon: LineChart, exact: true },
      { href: "/admin/finance/expenses", label: "Expenses", icon: Receipt },
      { href: "/admin/finance/loans", label: "Founder loans", icon: Landmark },
      { href: "/admin/payouts", label: "Payouts", icon: Wallet },
    ],
  },
  {
    title: "People",
    tabs: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/hospitals", label: "Hospitals", icon: Hospital },
      { href: "/admin/dietitians", label: "Dietitians", icon: Stethoscope },
      { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
      { href: "/admin/agents", label: "Doctor acquisition reps", icon: Handshake },
      { href: "/admin/creators", label: "Creators", icon: Megaphone },
      { href: "/admin/creator-partners", label: "Creator partners", icon: BadgePercent },
      { href: "/admin/email", label: "Email", icon: Mail },
    ],
  },
  {
    title: "Content",
    tabs: [
      { href: "/admin/blog", label: "Blog", icon: PenLine },
    ],
  },
];
const TABS = GROUPS.flatMap((g) => g.tabs);

/**
 * Tabs that blink red when money is due (founder, 2026-11-16), from
 * /api/admin/payouts/due: Payouts once last week's doctor/rep/dietitian money
 * is unpaid, Creator partners once a creator's earning is 14 days old.
 * Read at most once a minute, shared by both menus.
 */
let dueCache: { at: number; due: Set<string> } | null = null;
function useDue(): Set<string> {
  const path = usePathname();
  const [due, setDue] = useState<Set<string>>(dueCache?.due ?? new Set());
  useEffect(() => {
    if (dueCache && Date.now() - dueCache.at < 60_000) {
      setDue(dueCache.due);
      return;
    }
    let live = true;
    fetch("/api/admin/payouts/due")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { payouts?: number; creators?: number } | null) => {
        const s = new Set<string>();
        if (d?.payouts) s.add("/admin/payouts");
        if (d?.creators) s.add("/admin/creator-partners");
        dueCache = { at: Date.now(), due: s };
        if (live) setDue(s);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);
  return due;
}

function DueDot() {
  return (
    <span className="relative ml-auto flex h-2.5 w-2.5 shrink-0" aria-hidden>
      <span className="absolute inline-flex h-full w-full rounded-full bg-verdict-red opacity-75 motion-safe:animate-ping" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-verdict-red" />
    </span>
  );
}

function useHere() {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href));
}

async function logOut() {
  await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
  window.location.href = "/admin";
}

/** The left sidebar, from `lg` up. */
export function AdminSidebarNav() {
  const here = useHere();
  const due = useDue();
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{g.title}</p>
          <div className="flex flex-col gap-0.5">
            {g.tabs.map(({ href, label, icon: Icon, ...t }) => {
              const on = here(href, "exact" in t && t.exact);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2 font-display text-sm font-semibold transition-colors ${
                    on ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {on && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-leaf" />}
                  <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.2} />
                  {label}
                  {due.has(href) && (
                    <>
                      <DueDot />
                      <span className="sr-only"> (time to pay)</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** The foot of the sidebar: back to the site, and log out. */
export function AdminSidebarFoot() {
  return (
    <div className="space-y-3">
      <a
        href="/"
        className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white"
      >
        <ExternalLink className="h-3.5 w-3.5" /> View live site
      </a>
      <button
        onClick={logOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}

/** Under `lg`: one row of tabs you can swipe, and a small log-out link. */
export function AdminMobileNav() {
  const here = useHere();
  const due = useDue();
  const nav = useRef<HTMLElement>(null);
  // With nine screens the row is wider than a phone: bring the current one into view.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  });
  return (
    <nav ref={nav} className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5">
      {TABS.map(({ href, label, icon: Icon, ...t }) => {
        const on = here(href, "exact" in t && t.exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold transition-colors ${
              on ? "bg-white/15 text-white ring-1 ring-inset ring-white/25" : "text-white/70"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            {label}
            {due.has(href) && (
              <>
                <DueDot />
                <span className="sr-only"> (time to pay)</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminMobileLogOut() {
  return (
    <button onClick={logOut} className="text-xs font-bold text-white/80 hover:text-white">
      Log out
    </button>
  );
}
