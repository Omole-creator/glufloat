"use client";

import { Download } from "lucide-react";
import { jsPDF } from "jspdf";

export type ExportData = {
  range: string;
  stats: { label: string; value: string }[];
  /** The same numbers split by who the person is. Counts and money only. */
  byType: {
    who: string;
    signups: string;
    trials: string;
    conversion: string;
    paying: string;
    revenue: string;
  }[];
  monthly: {
    month: string;
    newSubs: number;
    churned: number;
    activeEnd: number;
    churnRate: number;
    retention: number;
  }[];
};

// Downloads an aggregate PDF. No user names or emails are included.
export default function ExportButton({ data }: { data: ExportData }) {
  const download = () => {
    const doc = new jsPDF();
    const now = new Date();
    doc.setFontSize(18);
    doc.text("Glufloat — the numbers", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${now.toLocaleString()}  ·  view: ${data.range}`, 14, 25);
    doc.setTextColor(0);

    let y = 38;
    doc.setFontSize(12);
    doc.text("Summary", 14, y);
    y += 8;
    doc.setFontSize(10);
    for (const s of data.stats) {
      doc.text(`${s.label}`, 16, y);
      doc.text(`${s.value}`, 120, y);
      y += 7;
    }

    // Who these people are. Without it the summary above hides the fact that
    // health workers barely subscribe, which is the whole reason for the split.
    y += 6;
    doc.setFontSize(12);
    doc.text("By who they are", 14, y);
    y += 8;
    doc.setFontSize(9);
    const tCols = [16, 62, 92, 118, 148, 172];
    const tHead = ["Who", "Signups", "Trials", "Trial to paid", "Paying now", "Revenue"];
    tHead.forEach((h, i) => doc.text(h, tCols[i], y));
    y += 5;
    doc.setDrawColor(200);
    doc.line(14, y - 2, 196, y - 2);
    for (const t of data.byType) {
      const row = [t.who, t.signups, t.trials, t.conversion, t.paying, t.revenue];
      row.forEach((c, i) => doc.text(c, tCols[i], y));
      y += 6;
    }

    y += 6;
    doc.setFontSize(12);
    doc.text("Retention & churn, month on month", 14, y);
    y += 8;
    doc.setFontSize(9);
    const cols = [16, 55, 80, 108, 135, 165];
    const head = ["Month", "New", "Churned", "Active", "Churn %", "Retention %"];
    head.forEach((h, i) => doc.text(h, cols[i], y));
    y += 5;
    doc.setDrawColor(200);
    doc.line(14, y - 2, 196, y - 2);
    for (const m of data.monthly) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const row = [
        m.month,
        String(m.newSubs),
        String(m.churned),
        String(m.activeEnd),
        `${m.churnRate}%`,
        `${m.retention}%`,
      ];
      row.forEach((c, i) => doc.text(c, cols[i], y));
      y += 6;
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Aggregate report. No personal user data included.",
      14,
      290,
    );

    const slug = now.toISOString().slice(0, 10);
    doc.save(`glufloat-metrics-${slug}.pdf`);
  };

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-mist"
    >
      <Download className="h-4 w-4" />
      Download PDF
    </button>
  );
}
