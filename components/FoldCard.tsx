import { ChevronDown } from "lucide-react";

/**
 * A white card whose body folds away under its title. Native <details>, so it
 * works on a server-rendered page with no JavaScript, and in a client one.
 * Used only where a part is secondary (history, a form you use now and then)
 * or grows long (one card per person). The things people come for stay open.
 *
 * `meta` sits on the right of the title row and stays visible when folded,
 * so a folded card still says what is inside (a count, an amount).
 */
export default function FoldCard({
  title,
  sub,
  meta,
  open = false,
  id,
  className = "",
  bodyClassName = "px-5 pb-5 sm:px-6 sm:pb-6",
  children,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  meta?: React.ReactNode;
  open?: boolean;
  id?: string;
  className?: string;
  /** Padding of the body; pass "" for a table that runs edge to edge. */
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={open} className={`group min-w-0 rounded-2xl border border-[#e3e9f1] bg-white ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-bold text-ink sm:text-lg">{title}</span>
          {sub && <span className="mt-0.5 block text-xs text-ink-soft">{sub}</span>}
        </span>
        {meta && <span className="shrink-0 text-right text-xs text-ink-soft">{meta}</span>}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e3e9f1] text-ink-soft transition-transform group-open:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>
      <div className={bodyClassName}>{children}</div>
    </details>
  );
}
