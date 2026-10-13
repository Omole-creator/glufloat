import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { hospitalLive, isPractice, orgWords, planName, PRACTICE_TRIAL_DAYS, waitingForFirstPatient } from "@/lib/hospitalPlans";
import { ROLE_LABEL, type StaffContext } from "@/lib/hospitalServer";
import { HospitalLogOut, HospitalMobileNav, HospitalSidebarNav, HospitalSwitcher } from "./HospitalNav";

/**
 * The frame of the hospital dashboard: the same deep-blue sidebar language as
 * GluFloat's own admin, carrying the HOSPITAL's name, because this is their
 * screen. Navigation in the sidebar, anything a page can do beside its title.
 */
export default function HospitalShell({
  ctx,
  title,
  subtitle,
  actions,
  children,
}: {
  ctx: StaffContext;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const h = ctx.hospital;
  const hid = ctx.all.length > 1 ? h.id : null;
  const live = hospitalLive(h);
  // GluFloat for dietitians: same dashboard, her own words.
  const practice = isPractice(h);
  const words = orgWords(h);
  const roleLabel = practice ? words.adminLabel : ROLE_LABEL[ctx.staff.role];
  // A dietitian with no patient yet: nothing has ended, her 14 days have not begun.
  const notStarted = waitingForFirstPatient(h);
  const options = ctx.all.map((x) => ({ id: x.hospital.id, name: x.hospital.name }));
  const daysLeft = h.access_until ? Math.ceil((new Date(h.access_until).getTime() - Date.now()) / 86400000) : 0;

  return (
    <div className="min-h-screen bg-[#f2f5f9]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0b2e59] px-4 py-5 lg:flex">
        <Link href="/hospital" className="flex items-center gap-2.5 px-1.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <Image src="/logo-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            GluFloat
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{words.product}</span>
          </span>
        </Link>
        <div className="mt-6 rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-inset ring-white/10">
          <p className="font-display text-sm font-bold leading-snug text-white">{h.name}</p>
          <p className="mt-0.5 text-xs text-white/60">{planName(h.plan)}</p>
          <HospitalSwitcher options={options} current={h.id} />
        </div>
        <div className="-mx-1 mt-6 min-h-0 flex-1 overflow-y-auto px-1">
          <HospitalSidebarNav role={ctx.staff.role} hid={hid} practice={practice} />
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="truncate px-1 text-sm font-semibold text-white">{ctx.staff.name}</p>
          <p className="mb-3 px-1 text-xs text-white/55">{roleLabel}</p>
          <HospitalLogOut />
        </div>
      </aside>

      <header className="sticky top-0 z-30 bg-[#0b2e59] lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/hospital" className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
              <Image src="/logo-mark.png" alt="" width={22} height={22} className="h-5.5 w-5.5" />
            </span>
            <span className="truncate font-display text-base font-bold text-white">{h.name}</span>
          </Link>
          <HospitalLogOut compact />
        </div>
        <HospitalMobileNav role={ctx.staff.role} hid={hid} practice={practice} />
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-9">
          {notStarted && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-brand/[0.07] px-4 py-3.5 text-sm text-ink ring-1 ring-inset ring-brand/15">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p>
                <span className="font-bold">Your {PRACTICE_TRIAL_DAYS} free days start when your first patient joins.</span>{" "}
                Add your patients, or share your QR code with them.
              </p>
            </div>
          )}
          {!live && !notStarted && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-verdict-red/10 px-4 py-3.5 text-sm text-ink ring-1 ring-inset ring-verdict-red/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-verdict-red" />
              {practice ? (
                <p>
                  <span className="font-bold">Your GluFloat plan has ended.</span> Your patients are no longer covered and
                  their records are closed.{" "}
                  <Link href="/hospital/plan" className="font-bold text-brand underline">
                    Choose a plan to continue
                  </Link>
                </p>
              ) : (
                <p>
                  <span className="font-bold">Your GluFloat plan has ended.</span> Your patients are no longer covered and their
                  records are closed to your staff. Please contact GluFloat to continue.
                </p>
              )}
            </div>
          )}
          {live && daysLeft <= 7 && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-verdict-yellow/20 px-4 py-3.5 text-sm text-ink ring-1 ring-inset ring-verdict-yellow/40">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <span className="font-bold">
                  {h.status === "pilot" ? (practice ? "Your free days" : "Your free pilot") : "Your plan"} ends in {daysLeft}{" "}
                  {daysLeft === 1 ? "day" : "days"}.
                </span>{" "}
                {practice ? (
                  <Link href="/hospital/plan" className="font-bold text-brand underline">
                    Choose a plan to keep your patients covered
                  </Link>
                ) : ctx.staff.role === "admin" ? (
                  "Contact GluFloat to keep your patients covered."
                ) : (
                  "Please tell your hospital admin."
                )}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
