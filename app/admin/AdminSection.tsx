import { ChevronDown } from "lucide-react";

/**
 * One part of an admin screen that folds away. Native <details>, so it works
 * with no JavaScript and on a server-rendered page, and the `id` lets the jump
 * row at the top of the page land on it.
 */
export default function AdminSection({
  id,
  title,
  sub,
  open = true,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={open} className="group mt-8 scroll-mt-28 lg:scroll-mt-8">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl py-1 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-display text-lg font-bold text-ink">{title}</span>
          {sub && <span className="block text-xs text-ink-soft">{sub}</span>}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e3e9f1] bg-white text-ink-soft transition-transform group-open:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

/** The row of links at the top of a page, one per section. */
export function AdminJump({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          className="shrink-0 rounded-full border border-[#e3e9f1] bg-white px-3.5 py-1.5 text-xs font-bold text-ink transition-colors hover:border-brand hover:text-brand"
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}
