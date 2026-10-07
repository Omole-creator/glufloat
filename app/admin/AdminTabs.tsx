"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Handshake,
  PenLine,
  Mail,
  ExternalLink,
  LogOut,
  LineChart,
  Receipt,
  Landmark,
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
    ],
  },
  {
    title: "People",
    tabs: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/partners", label: "Partners", icon: Handshake },
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
