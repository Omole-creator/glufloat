"use client";

import { useRouter } from "next/navigation";

const OPTS: [string, string][] = [
  ["day", "Today"],
  ["week", "This week"],
  ["month", "This month"],
  ["quarter", "This quarter"],
  ["year", "This year"],
];

export default function RangeSelect({ range, year }: { range: string; year: number }) {
  const router = useRouter();
  return (
    <select
      value={range}
      onChange={(e) => router.push(`/admin?range=${e.target.value}&year=${year}`)}
      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm outline-none"
      aria-label="Time period"
    >
      {OPTS.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
