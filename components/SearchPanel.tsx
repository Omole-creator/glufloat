"use client";

import { useMemo, useState } from "react";
import { searchFoods } from "@/lib/search";
import type { Food } from "@/lib/types";
import VerdictCard from "./VerdictCard";
import Paywall from "./Paywall";
import { freeChecksLeft, hasAccess, isGated, recordCheck } from "@/lib/access";

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Food | null>(null);
  const [gated, setGated] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  const results = useMemo(() => searchFoods(query), [query]);

  const pick = (food: Food) => {
    if (isGated()) {
      setGated(true);
      setPicked(null);
      return;
    }
    if (!hasAccess()) {
      recordCheck();
      setLeft(freeChecksLeft());
    }
    setPicked(food);
    setQuery("");
  };

  return (
    <div>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
            setGated(false);
          }}
          placeholder="Try eba, jollof, dodo, moi moi, coke..."
          className="w-full rounded-full border-2 border-line bg-white py-3.5 pl-12 pr-5 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft/50 focus:border-brand"
          aria-label="Search a food"
        />
      </div>

      {results.length > 0 && !picked && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          {results.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => pick(f)}
                className="flex w-full items-center justify-between px-5 py-3 text-left text-sm transition-colors hover:bg-mist"
              >
                <span className="font-medium text-ink">{f.name}</span>
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${
                    f.baseVerdict === "green"
                      ? "bg-verdict-green"
                      : f.baseVerdict === "yellow"
                        ? "bg-verdict-yellow"
                        : "bg-verdict-red"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && results.length === 0 && !picked && (
        <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm text-ink-soft">
          Not in the list yet. The database grows from what people search, so
          this one is on its way.
        </p>
      )}

      <div className="mt-4">
        {gated && <Paywall context="search" />}
        {picked && !gated && (
          <>
            <VerdictCard food={picked} />
            {left !== null && left >= 0 && !hasAccess() && (
              <p className="mt-3 text-center text-xs font-medium text-ink-soft">
                {left === 0
                  ? "That was your last free check."
                  : `${left} free ${left === 1 ? "check" : "checks"} left.`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
