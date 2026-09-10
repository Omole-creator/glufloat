/**
 * The headline-numbers band — solid brand blue, white text, dividers between
 * items. Same colour and shape as the "Your daily calorie target" box on
 * PersonalizationSettings ("Fit me"): one flat blue surface carrying the
 * numbers that matter most, instead of every stat looking the same weight.
 */
export default function AdminHero({
  items,
}: {
  items: { label: string; value: string; sub?: string }[];
}) {
  return (
    <div className="rounded-2xl bg-brand p-5 text-white shadow-[0_10px_36px_-14px_rgba(12,42,71,0.45)] sm:p-6">
      <div
        className={`grid gap-5 ${
          items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"
        }`}
      >
        {items.map((it, i) => (
          <div
            key={i}
            className={i > 0 ? "sm:border-l sm:border-white/20 sm:pl-5" : ""}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {it.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">
              {it.value}
            </p>
            {it.sub && <p className="mt-1 text-xs text-white/70">{it.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
