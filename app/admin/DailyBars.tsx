/**
 * One measure over time, one bar per day (or week, for a long period). Plain
 * divs, no chart library. Hovering a bar names its day and count; the peak is
 * labelled so the scale can be read without an axis.
 */
export default function DailyBars({
  points,
  unit,
}: {
  points: { label: string; value: number }[];
  unit: string;
}) {
  const top = Math.max(0, ...points.map((p) => p.value));
  const total = points.reduce((n, p) => n + p.value, 0);
  if (points.length === 0 || total === 0) {
    return <p className="py-12 text-center text-sm text-ink-soft">No {unit} in this period.</p>;
  }
  return (
    <div>
      <p className="text-xs text-ink-soft">
        Busiest: <span className="font-bold text-ink">{top.toLocaleString()}</span> {unit}
      </p>
      <div className="mt-3 flex h-40 items-end gap-[2px] border-b border-[#e3e9f1]">
        {points.map((p, i) => (
          <div key={i} className="group/bar relative flex h-full flex-1 items-end" title={`${p.label}: ${p.value} ${unit}`}>
            <div
              className="w-full rounded-t-[4px] bg-brand transition-colors group-hover/bar:bg-leaf"
              style={{ height: p.value ? `${Math.max(3, (p.value / (top || 1)) * 100)}%` : "0" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-soft">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
