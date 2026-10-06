"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EXPENSE_CATEGORIES, PAYER_LABEL, type Payer } from "@/lib/financeConfig";

/**
 * Narrow the expense list by category and by who paid. Lives in the URL next
 * to the period, so a filtered view can be bookmarked like any other.
 */
export default function ExpenseFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  function set(key: string, value: string) {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    router.push(`/admin/finance/expenses?${q}`);
  }
  const box =
    "h-9 rounded-lg border border-[#e3e9f1] bg-white px-2.5 text-sm font-semibold text-ink outline-none hover:border-brand/40 focus:border-brand";
  return (
    <div className="flex flex-wrap gap-2">
      <select aria-label="Show one category" value={sp.get("cat") ?? ""} onChange={(e) => set("cat", e.target.value)} className={box}>
        <option value="">Every category</option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
      <select aria-label="Show who paid" value={sp.get("by") ?? ""} onChange={(e) => set("by", e.target.value)} className={box}>
        <option value="">Anyone paid</option>
        {(Object.keys(PAYER_LABEL) as Payer[]).map((k) => (
          <option key={k} value={k}>{PAYER_LABEL[k]}</option>
        ))}
      </select>
    </div>
  );
}
