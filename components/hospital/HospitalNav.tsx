"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, LogOut, MessageCircle, QrCode, UserPlus, Users, Stethoscope, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "admin" | "doctor" | "dietitian";

function tabs(role: Role, practice: boolean, doctor = false) {
  // A GluFloat doctor: no staff and no plan to pay for. Their QR code, and
  // what they have earned looking after their patients.
  if (doctor)
    return [
      { href: "/hospital", label: "Patients", icon: Users, exact: true },
      { href: "/hospital/messages", label: "Messages", icon: MessageCircle, exact: false },
      { href: "/hospital/add", label: "Add patients", icon: UserPlus, exact: false },
      { href: "/hospital/plan", label: "QR code", short: "QR code", icon: QrCode, exact: false },
      { href: "/hospital/earnings", label: "Earnings", icon: Wallet, exact: false },
    ];
  const all = [
    { href: "/hospital", label: "Patients", icon: Users, exact: true, adminOnly: false, hospitalOnly: false },
    { href: "/hospital/messages", label: "Messages", icon: MessageCircle, exact: false, adminOnly: false, hospitalOnly: false },
    { href: "/hospital/add", label: "Add patients", icon: UserPlus, exact: false, adminOnly: true, hospitalOnly: false },
    // A dietitian's practice is one person: she has no staff to manage.
    { href: "/hospital/staff", label: "Doctors and dietitians", short: "Staff", icon: Stethoscope, exact: false, adminOnly: false, hospitalOnly: true },
    // A dietitian's patients pay her in the app (patient-pays-schema.sql): her
    // price, her money and her QR code live on this one page.
    practice
      ? { href: "/hospital/plan", label: "Price and earnings", short: "Earnings", icon: Wallet, exact: false, adminOnly: true, hospitalOnly: false }
      : { href: "/hospital/plan", label: "Plan and QR code", short: "Plan", icon: CreditCard, exact: false, adminOnly: true, hospitalOnly: false },
  ];
  return all.filter((t) => (!t.adminOnly || role === "admin") && (!t.hospitalOnly || !practice));
}

function useHere() {
  const path = usePathname();
  return (href: string, exact: boolean) =>
    exact ? path === href || path.startsWith("/hospital/patients") : path.startsWith(href);
}

export function withHid(href: string, hid: string | null) {
  return hid ? `${href}?h=${hid}` : href;
}

async function logOut(router: ReturnType<typeof useRouter>) {
  await createClient().auth.signOut();
  router.push("/signin");
  router.refresh();
}

/** How many patients wait for a reply, on the Messages tab. */
function Count({ n, light }: { n: number; light?: boolean }) {
  if (n <= 0) return null;
  return (
    <span className={`${light ? "ml-1" : "ml-auto"} rounded-full bg-verdict-red px-1.5 text-[11px] font-bold leading-5 text-white`}>
      {n}
      <span className="sr-only"> waiting</span>
    </span>
  );
}

export function HospitalSidebarNav({
  role,
  hid,
  practice = false,
  doctor = false,
  waiting = 0,
}: {
  role: Role;
  hid: string | null;
  practice?: boolean;
  doctor?: boolean;
  waiting?: number;
}) {
  const here = useHere();
  return (
    <nav className="flex flex-col gap-0.5">
      {tabs(role, practice, doctor).map(({ href, label, icon: Icon, exact }) => {
        const on = here(href, exact);
        return (
          <Link
            key={href}
            href={withHid(href, hid)}
            aria-current={on ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-sm font-semibold transition-colors ${
              on ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {on && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-leaf" />}
            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.2} />
            {label}
            {href === "/hospital/messages" && <Count n={waiting} />}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The phone's nav: a bar fixed to the BOTTOM of the screen, icon over a short
 * label, every tab visible at once (2026-10-16, replacing a sideways-scrolling
 * row that hid the last tabs, so a doctor's Earnings sat off-screen). The same
 * pattern patients use in the GluFloat app. At most 5 tabs, which the tab
 * lists above keep to. Hidden from lg up, where the sidebar shows.
 */
const MOBILE_LABEL: Record<string, string> = {
  "/hospital": "Patients",
  "/hospital/messages": "Messages",
  "/hospital/add": "Add",
  "/hospital/staff": "Staff",
  "/hospital/plan": "Plan",
  "/hospital/earnings": "Earnings",
};

export function HospitalMobileNav({
  role,
  hid,
  practice = false,
  doctor = false,
  waiting = 0,
}: {
  role: Role;
  hid: string | null;
  practice?: boolean;
  doctor?: boolean;
  waiting?: number;
}) {
  const here = useHere();
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_28px_-16px_rgba(12,42,71,0.22)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-between px-0.5">
        {tabs(role, practice, doctor).map((t) => {
          const on = here(t.href, t.exact);
          const Icon = t.icon;
          const label = doctor && t.href === "/hospital/plan" ? "QR code" : practice && t.href === "/hospital/plan" ? "Earnings" : MOBILE_LABEL[t.href] ?? t.label;
          const count = t.href === "/hospital/messages" ? waiting : 0;
          return (
            <Link
              key={t.href}
              href={withHid(t.href, hid)}
              aria-current={on ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-center transition-colors ${on ? "text-brand" : "text-ink-soft"}`}
            >
              <span
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors ${
                  on ? "bg-brand text-white ring-brand" : "bg-mist text-ink-soft ring-line"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.3} />
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-verdict-red px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
                    {count}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-[10.5px] font-semibold leading-tight">
                {label}
                {count > 0 && <span className="sr-only"> ({count} waiting)</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function HospitalLogOut({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return compact ? (
    <button onClick={() => logOut(router)} className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white">
      <LogOut className="h-3.5 w-3.5" /> Log out
    </button>
  ) : (
    <button
      onClick={() => logOut(router)}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
    >
      <LogOut className="h-4 w-4" /> Log out
    </button>
  );
}

/** Only for somebody who works at more than one hospital. */
export function HospitalSwitcher({ options, current }: { options: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  const path = usePathname();
  if (options.length < 2) return null;
  return (
    <select
      aria-label="Which hospital"
      value={current}
      onChange={(e) => router.push(`${path.startsWith("/hospital/patients") ? "/hospital" : path}?h=${e.target.value}`)}
      className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 [&>option]:text-ink"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
