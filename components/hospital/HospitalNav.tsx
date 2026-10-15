"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, LogOut, MessageCircle, UserPlus, Users, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "admin" | "doctor" | "dietitian";

function tabs(role: Role, practice: boolean) {
  const all = [
    { href: "/hospital", label: "Patients", icon: Users, exact: true, adminOnly: false, hospitalOnly: false },
    { href: "/hospital/messages", label: "Messages", icon: MessageCircle, exact: false, adminOnly: false, hospitalOnly: false },
    { href: "/hospital/add", label: "Add patients", icon: UserPlus, exact: false, adminOnly: true, hospitalOnly: false },
    // A dietitian's practice is one person: she has no staff to manage.
    { href: "/hospital/staff", label: "Doctors and dietitians", short: "Staff", icon: Stethoscope, exact: false, adminOnly: false, hospitalOnly: true },
    { href: "/hospital/plan", label: "Plan and QR code", short: "Plan", icon: CreditCard, exact: false, adminOnly: true, hospitalOnly: false },
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

export function HospitalSidebarNav({ role, hid, practice = false, waiting = 0 }: { role: Role; hid: string | null; practice?: boolean; waiting?: number }) {
  const here = useHere();
  return (
    <nav className="flex flex-col gap-0.5">
      {tabs(role, practice).map(({ href, label, icon: Icon, exact }) => {
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

export function HospitalMobileNav({ role, hid, practice = false, waiting = 0 }: { role: Role; hid: string | null; practice?: boolean; waiting?: number }) {
  const here = useHere();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5">
      {tabs(role, practice).map((t) => {
        const on = here(t.href, t.exact);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={withHid(t.href, hid)}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold transition-colors ${
              on ? "bg-white/15 text-white ring-1 ring-inset ring-white/25" : "text-white/70"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            {"short" in t && t.short ? t.short : t.label}
            {t.href === "/hospital/messages" && <Count n={waiting} light />}
          </Link>
        );
      })}
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
