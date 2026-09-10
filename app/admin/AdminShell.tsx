import Link from "next/link";
import AdminTabs from "./AdminTabs";

/**
 * The frame every admin screen sits in.
 *
 * One bar, always in the same place, with the four screens as tabs and the
 * current one marked. Anything a page can DO (download, pick a period) lives
 * in the page body, never in the nav. Navigation is one thing, actions are
 * another, and they must not look the same.
 *
 * The masthead is solid brand blue with white text — the same colour
 * language as PersonalizationSettings ("Fit me") and TodaysMeal's hero card
 * — so the tool this data comes FROM and the screen you read it ON share one
 * identity, instead of a generic grey admin chrome.
 */
export default function AdminShell({
  title,
  icon,
  actions,
  children,
  width = "max-w-6xl",
}: {
  title: string;
  /** A rendered lucide icon element, shown in a tinted chip beside the title. */
  icon?: React.ReactNode;
  /** Buttons that belong to THIS screen. They sit with the title, not in the nav. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="min-h-screen bg-mist">
      {/* The bar. Sticky, because the tables below it are long. */}
      <header className="sticky top-0 z-30 bg-brand shadow-[0_4px_20px_-8px_rgba(12,42,71,0.4)]">
        <div className={`mx-auto flex ${width} flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3`}>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Glufloat
            </span>
            <span className="rounded-md bg-white/15 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-white/90 ring-1 ring-inset ring-white/25">
              Admin
            </span>
          </Link>
          <AdminTabs />
        </div>
      </header>

      <main className={`mx-auto ${width} px-5 pb-16 pt-8`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
                {icon}
              </span>
            )}
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              {title}
            </h1>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}
