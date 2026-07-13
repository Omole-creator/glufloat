import Link from "next/link";
import AdminTabs from "./AdminTabs";

/**
 * The frame every admin screen sits in.
 *
 * Before this, each page grew its own row of pill links, so navigation and
 * actions looked identical (a "Users" link and a "Download PDF" button were the
 * same shape, in the same row), and every page except the hub was a dead end
 * with one "Back to dashboard" pill. Getting from Users to Partners meant going
 * back to the middle first.
 *
 * Now: one bar, always in the same place, with the four screens as tabs and the
 * current one marked. Anything a page can DO (download, pick a period) lives in
 * the page body, never in the nav. Navigation is one thing, actions are another,
 * and they must not look the same.
 */
export default function AdminShell({
  title,
  intro,
  actions,
  children,
  width = "max-w-6xl",
}: {
  title: string;
  intro?: string;
  /** Buttons that belong to THIS screen. They sit with the title, not in the nav. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="min-h-screen bg-mist">
      {/* The bar. Sticky, because the tables below it are long. */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className={`mx-auto flex ${width} flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3`}>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              Glufloat
            </span>
            <span className="rounded-md bg-ink/5 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-ink-soft">
              Admin
            </span>
          </Link>
          <AdminTabs />
        </div>
      </header>

      <main className={`mx-auto ${width} px-5 pb-16 pt-8`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            {intro && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {intro}
              </p>
            )}
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
