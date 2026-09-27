import Link from "next/link";

/**
 * A titled white panel for anything bigger than one number: a list, a chart,
 * a table. `link` puts a small green "View all" style link in the corner.
 */
export default function AdminCard({
  title,
  sub,
  link,
  children,
  className = "",
  flush = false,
}: {
  title: string;
  sub?: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
  /** No inner padding under the title, for a table that runs edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#e3e9f1] bg-white ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-ink sm:text-lg">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
        </div>
        {link && (
          <Link
            href={link.href}
            className="shrink-0 text-sm font-bold text-leaf-deep hover:underline"
          >
            {link.label} &rarr;
          </Link>
        )}
      </div>
      <div className={flush ? "mt-4" : "px-5 pb-5 pt-4 sm:px-6 sm:pb-6"}>{children}</div>
    </section>
  );
}
