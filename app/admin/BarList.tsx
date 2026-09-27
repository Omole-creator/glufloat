/**
 * A ranked list with a bar under each row, longest first: "which foods",
 * "where from", "who". One colour, because the bar only carries size; the
 * label and number are text, so nothing depends on seeing the colour.
 */
export default function BarList({
  rows,
  empty = "Nothing yet.",
  max: maxRows = 8,
}: {
  rows: { label: string; value: number; note?: string }[];
  empty?: string;
  max?: number;
}) {
  const shown = [...rows].sort((a, b) => b.value - a.value).slice(0, maxRows);
  const top = Math.max(1, ...shown.map((r) => r.value));
  if (shown.length === 0) return <p className="py-6 text-center text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {shown.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.value.toLocaleString()}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink">{r.label}</span>
            <span className="shrink-0 font-display font-bold text-ink">
              {r.value.toLocaleString()}
              {r.note && <span className="ml-1.5 font-sans text-xs font-normal text-ink-soft">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[#eef2f7]">
            <div
              className="h-1.5 rounded-full bg-brand"
              style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
