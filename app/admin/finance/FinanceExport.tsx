"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";

export type FinanceExportData = {
  period: string;
  compareLabel: string | null;
  statement: { label: string; value: string; prev?: string; strong?: boolean }[];
  metrics: { group: string; rows: { label: string; value: string }[] }[];
  months: { label: string; revenue: string; growth: string; expenses: string; net: string; margin: string }[];
  founders: { name: string; lent: string; repaid: string; owed: string }[];
  categories: { label: string; value: string }[];
};

/**
 * Two downloads for the finance screen. The PDF is the one to send to an
 * investor or a grant panel: the profit and loss, the numbers they ask for,
 * growth month by month, and what the founders have lent. It holds totals
 * only, never a customer's name. The CSV is every entry, for an accountant.
 */
export default function FinanceExport({ data, csvHref }: { data: FinanceExportData; csvHref: string }) {
  const download = () => {
    const doc = new jsPDF();
    const W = 210;
    let y = 18;
    const need = (h: number) => {
      if (y + h > 282) {
        doc.addPage();
        y = 18;
      }
    };
    const heading = (t: string) => {
      need(16);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(27, 95, 170);
      doc.text(t, 14, y);
      doc.setTextColor(12, 42, 71);
      y += 7;
    };
    const row = (cells: string[], xs: number[], bold = false) => {
      need(7);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(9.5);
      cells.forEach((c, i) => {
        const right = i > 0;
        doc.text(c, right ? xs[i] : xs[0], y, right ? { align: "right" } : undefined);
      });
      y += 6;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(12, 42, 71);
    doc.text("GluFloat: finance report", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(`${data.period}  ·  made ${new Date().toLocaleDateString("en-GB")}  ·  amounts in Naira`, 14, y);
    doc.setTextColor(12, 42, 71);
    y += 4;

    heading("Profit and loss");
    const sx = [16, data.compareLabel ? 150 : W - 16, W - 16];
    if (data.compareLabel) row(["", "This period", data.compareLabel], sx, true);
    for (const s of data.statement) {
      row(data.compareLabel ? [s.label, s.value, s.prev ?? ""] : [s.label, s.value], sx, s.strong);
    }

    for (const g of data.metrics) {
      heading(g.group);
      for (const m of g.rows) row([m.label, m.value], [16, W - 16]);
    }

    heading("Month by month");
    const mx = [16, 70, 98, 130, 162, W - 16];
    row(["Month", "Revenue", "Growth", "Expenses", "Profit/loss", "Net margin"], mx, true);
    for (const m of data.months) row([m.label, m.revenue, m.growth, m.expenses, m.net, m.margin], mx);

    if (data.categories.length) {
      heading("Spending by category (this period)");
      for (const c of data.categories) row([c.label, c.value], [16, W - 16]);
    }

    heading("Founder loans (all time)");
    const fx = [16, 110, 150, W - 16];
    row(["Founder", "Lent", "Paid back", "Still owed"], fx, true);
    for (const f of data.founders) row([f.name, f.lent, f.repaid, f.owed], fx);

    need(14);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "Paystack fees are estimated from Paystack's published local rate. Cash is worked out from the records, not read from the bank.",
      14,
      y,
      { maxWidth: W - 28 },
    );

    doc.save(`glufloat-finance-${data.period.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  };

  const btn =
    "inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e9f1] bg-white px-3.5 text-sm font-bold text-ink transition-colors hover:border-brand/40 hover:text-brand";
  return (
    <>
      <a href={csvHref} className={btn}>
        <FileSpreadsheet className="h-4 w-4" /> Entries (CSV)
      </a>
      <button onClick={download} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep">
        <Download className="h-4 w-4" /> Finance report (PDF)
      </button>
    </>
  );
}
