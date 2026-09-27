import Link from "next/link";
import Image from "next/image";
import {
  AdminMobileLogOut,
  AdminMobileNav,
  AdminSidebarFoot,
  AdminSidebarNav,
} from "./AdminTabs";

/**
 * The frame every admin screen sits in.
 *
 * A deep brand-blue sidebar on the left (a row of tabs on a phone), a light
 * page, and white cards on it. Navigation lives in the sidebar; anything a page
 * can DO (download, pick a period) sits with that page's title, never in the
 * nav, so the two never look alike.
 */
export default function AdminShell({
  title,
  subtitle,
  icon,
  actions,
  children,
  width = "max-w-6xl",
}: {
  title: string;
  /** One short line under the title, e.g. the period on screen. */
  subtitle?: string;
  /** Kept for existing callers; the sidebar already marks the screen. */
  icon?: React.ReactNode;
  /** Buttons that belong to THIS screen. They sit with the title, not in the nav. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  void icon;
  return (
    <div className="min-h-screen bg-[#f2f5f9]">
      {/* Sidebar, from lg up. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[#0b2e59] px-4 py-5 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-1.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <Image src="/logo-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Glufloat
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              Admin
            </span>
          </span>
        </Link>
        <div className="mt-8 flex-1">
          <AdminSidebarNav />
        </div>
        <div className="border-t border-white/10 pt-4">
          <AdminSidebarFoot />
        </div>
      </aside>

      {/* Top bar, under lg. */}
      <header className="sticky top-0 z-30 bg-[#0b2e59] lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <Image src="/logo-mark.png" alt="" width={22} height={22} className="h-5.5 w-5.5" />
            </span>
            <span className="font-display text-base font-bold text-white">Glufloat admin</span>
          </Link>
          <AdminMobileLogOut />
        </div>
        <AdminMobileNav />
      </header>

      <main className="lg:pl-60">
        <div className={`mx-auto ${width} px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-9`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {title}
              </h1>
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
