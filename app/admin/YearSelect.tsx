"use client";

import { useRouter } from "next/navigation";

export default function YearSelect({
  range,
  year,
  years,
}: {
  range: string;
  year: number;
  years: number[];
}) {
  const router = useRouter();
  return (
    <select
      value={year}
      onChange={(e) => router.push(`/admin?range=${range}&year=${e.target.value}`)}
      className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow-sm outline-none"
      aria-label="Year"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
