/**
 * A page's headline numbers: a row of white stat cards, the same card as
 * AdminTile, laid out to fit however many numbers the page leads with.
 */
export default function AdminHero({
  items,
}: {
  items: { label: string; value: string; sub?: string }[];
}) {
  const cols =
    items.length >= 5
      ? "sm:grid-cols-2 lg:grid-cols-5"
      : items.length === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-3";
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${cols}`}>
      {items.map((it, i) => (
        <div
          key={i}
          className="min-w-0 rounded-2xl border border-[#e3e9f1] bg-white p-4 sm:p-5"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">
            {it.label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold leading-none sm:text-3xl text-ink">{it.value}</p>
          {it.sub && <p className="mt-2 text-xs text-ink-soft">{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}
