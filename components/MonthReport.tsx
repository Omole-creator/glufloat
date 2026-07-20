"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  monthStats,
  monthChecks,
  type MonthStats,
  type MealCheck,
} from "@/lib/history";
import { monthReportMessage } from "@/lib/shareMessage";
import ShareOnWhatsApp from "./ShareOnWhatsApp";

// Glufloat brand colours (from app/globals.css), as RGB for jsPDF.
const BRAND = [27, 95, 170] as const; // --blue
const INK = [12, 42, 71] as const; // --ink
const V = {
  green: [46, 204, 113] as const,
  yellow: [241, 196, 15] as const,
  red: [231, 76, 60] as const,
};
const TINT = {
  green: [223, 246, 233] as const,
  yellow: [252, 246, 214] as const,
  red: [250, 226, 222] as const,
};

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

  const MEANING_WORD = {
    green: "Good to eat",
    yellow: "Eat with care",
    red: "Better to skip",
  } as const;

  // A clean, Glufloat-branded PDF the person can hand or send to their doctor.
  const savePdf = () => {
    const doc = new jsPDF();
    const M = 14;
    const W = 210;
    const fill = (c: readonly [number, number, number]) =>
      doc.setFillColor(c[0], c[1], c[2]);
    const ink = (c: readonly [number, number, number]) =>
      doc.setTextColor(c[0], c[1], c[2]);

    // Brand header band.
    fill(BRAND);
    doc.rect(0, 0, W, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Glufloat", M, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Food record for the doctor", M, 23);

    ink(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("What I ate this month", M, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(
      `${stats.total} ${stats.total === 1 ? "meal" : "meals"} checked  ·  prepared ${new Date().toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "long", year: "numeric" },
      )}`,
      M,
      51,
    );

    // Three colour count boxes.
    const boxW = 58;
    const gap = 6;
    const boxY = 58;
    const boxes: [keyof typeof V, number][] = [
      ["green", stats.green],
      ["yellow", stats.yellow],
      ["red", stats.red],
    ];
    boxes.forEach(([k, n], i) => {
      const x = M + i * (boxW + gap);
      fill(TINT[k]);
      doc.roundedRect(x, boxY, boxW, 22, 2, 2, "F");
      fill(V[k]);
      doc.rect(x, boxY, boxW, 2.5, "F"); // colour strip on top
      ink(INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(String(n), x + 5, boxY + 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(MEANING_WORD[k], x + 5, boxY + 18);
    });

    // The food list.
    let y = 92;
    ink(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Every meal I checked", M, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const it of items) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      fill(V[it.verdict]);
      doc.circle(M + 1.5, y - 1.4, 1.6, "F");
      ink(INK);
      doc.text(it.label.slice(0, 70), M + 6, y);
      doc.setTextColor(140);
      doc.text(MEANING_WORD[it.verdict], 150, y);
      y += 7;
    }

    // Footer line.
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Made with Glufloat, which gives Nigerian foods a green, yellow or red rating for blood sugar.",
      M,
      290,
    );

    doc.save(`glufloat-food-record-${new Date().toISOString().slice(0, 10)}.pdf`);
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
          onClick={savePdf}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-ink"
        >
          <Download className="h-4 w-4" /> Save as PDF
        </button>
      </div>
    </div>
  );
}
