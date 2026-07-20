"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import {
  monthStats,
  monthChecks,
  type MonthStats,
  type MealCheck,
} from "@/lib/history";
import { monthReportMessage } from "@/lib/shareMessage";
import ShareOnWhatsApp from "./ShareOnWhatsApp";

const MEANING = {
  green: "Good to eat",
  yellow: "Eat with care",
  red: "Better to skip",
} as const;

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

/**
 * "What you ate this month" — the record a person can hand their doctor. It is
 * their own food only, and it is the strongest reason to keep checking every day:
 * the record itself becomes the thing of value, not any single lookup. Sent on
 * WhatsApp (where this audience lives) or printed.
 */
export default function MonthReport() {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [items, setItems] = useState<MealCheck[]>([]);

  useEffect(() => {
    monthStats().then(setStats);
    monthChecks().then(setItems);
  }, []);

  if (!stats || stats.total === 0) return null;

  const text = monthReportMessage(
    stats,
    items.map((i) => ({ label: i.label, verdict: i.verdict })),
  );

  // Print the record on its own, not the whole app screen. Same words as the
  // WhatsApp message, so the doctor reads exactly what the person sent.
  const print = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    const safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    w.document.write(
      `<title>My Glufloat food record</title><pre style="font-family: system-ui, sans-serif; font-size:15px; line-height:1.5; white-space:pre-wrap; padding:28px">${safe}</pre>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const Tile = ({ n, label, dot }: { n: number; label: string; dot: string }) => (
    <div className="flex-1 rounded-xl border border-line bg-mist px-3 py-2 text-center">
      <p className="font-display text-2xl font-bold text-ink">{n}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-soft">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">
        For your next doctor visit
      </p>
      <p className="mt-1 font-display text-lg font-bold text-ink">
        What you ate this month
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        You checked {stats.total} {stats.total === 1 ? "meal" : "meals"} this
        month. Show this to your doctor so they see how you have been eating.
      </p>

      <div className="mt-4 flex gap-2">
        <Tile n={stats.green} label={MEANING.green} dot={DOT.green} />
        <Tile n={stats.yellow} label={MEANING.yellow} dot={DOT.yellow} />
        <Tile n={stats.red} label={MEANING.red} dot={DOT.red} />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 max-h-48 space-y-1.5 overflow-y-auto border-t border-line pt-3 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-ink">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[i.verdict]}`} />
              <span className="truncate">{i.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ShareOnWhatsApp text={text} label="Send to my doctor on WhatsApp" />
        <button
          onClick={print}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-ink"
        >
          <Printer className="h-4 w-4" /> Print or save
        </button>
      </div>
    </div>
  );
}
