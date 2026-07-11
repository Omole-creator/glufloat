"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { COMMISSION_CAP, COMMISSION_RATE, naira } from "@/lib/partners";

/**
 * A PDF a partner can be sent, because they have no dashboard of their own.
 *
 * It contains COUNTS AND MONEY ONLY. No name, no email, no sign-up date of
 * anybody they referred. Those are Glufloat's users, and this is a document that
 * leaves the building: handing a nurse a name and a date would be telling her
 * that a particular person of hers has diabetes. The API route it reads does not
 * even fetch those columns, so there is nothing here to leak.
 *
 * The report covers whatever period is selected on the dashboard, so a weekly or
 * a monthly report for any week or month of any year is just: pick the period,
 * then press this.
 */
export default function PartnerReportButton({
  partnerId,
  partnerName,
  query,
  small = false,
}: {
  partnerId: string;
  partnerName: string;
  /** The period currently on screen. */
  query: Record<string, string>;
  small?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function make() {
    setBusy(true);
    try {
      const qs = new URLSearchParams({ id: partnerId, ...query });
      const res = await fetch(`/api/admin/partner-report?${qs}`);
      if (!res.ok) {
        alert("Could not build the report.");
        return;
      }
      const d = await res.json();

      const doc = new jsPDF();
      const M = 14;
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(27, 95, 170); // brand blue
      doc.text("Glufloat", M, y);
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text("Partner report", M + 30, y);
      doc.setTextColor(0);

      y += 12;
      doc.setFontSize(15);
      doc.text(d.partner.name, M, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(`${d.partner.profession}  ·  your link: /r/${d.partner.code}`, M, y);
      y += 5;
      doc.text(`Period: ${d.period.label}`, M, y);
      y += 5;
      doc.text(`Prepared ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, M, y);
      doc.setTextColor(0);

      // The money, first, because it is what they opened this for.
      y += 12;
      doc.setFillColor(240, 246, 252);
      doc.rect(M, y - 5, 182, 26, "F");
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text("EARNED THIS PERIOD", M + 4, y + 1);
      doc.text("OWED TO YOU NOW", M + 66, y + 1);
      doc.text("PAID TO YOU SO FAR", M + 128, y + 1);
      doc.setTextColor(0);
      doc.setFontSize(16);
      doc.text(naira(d.earned), M + 4, y + 11);
      doc.text(naira(d.pending), M + 66, y + 11);
      doc.text(naira(d.paidOut), M + 128, y + 11);
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(d.period.label.toLowerCase(), M + 4, y + 17);
      doc.text("paid out weekly", M + 66, y + 17);
      doc.text("all time", M + 128, y + 17);
      doc.setTextColor(0);

      // The funnel
      y += 36;
      doc.setFontSize(12);
      doc.text(`Your numbers · ${d.period.label}`, M, y);
      y += 8;
      doc.setFontSize(10);
      const rows: [string, string][] = [
        ["People who clicked your link", d.clicks.toLocaleString()],
        ["People who made an account", d.signups.toLocaleString()],
        ["People who started the free trial", d.trials.toLocaleString()],
        ["People of yours paying right now", d.activeSubs.toLocaleString()],
      ];
      for (const [k, v] of rows) {
        doc.setTextColor(70);
        doc.text(k, M + 2, y);
        doc.setTextColor(0);
        doc.text(v, 150, y);
        y += 7;
      }

      // All time
      y += 4;
      doc.setFontSize(12);
      doc.text("Since you joined", M, y);
      y += 8;
      doc.setFontSize(10);
      const life: [string, string][] = [
        ["Clicks on your link", d.lifetimeClicks.toLocaleString()],
        ["People you have brought", d.lifetimePeople.toLocaleString()],
        ["Total you have earned", naira(d.lifetimeEarned)],
      ];
      for (const [k, v] of life) {
        doc.setTextColor(70);
        doc.text(k, M + 2, y);
        doc.setTextColor(0);
        doc.text(v, 150, y);
        y += 7;
      }

      // Month by month
      if (d.months.length > 0) {
        y += 5;
        doc.setFontSize(12);
        doc.text("Month by month", M, y);
        y += 8;
        doc.setFontSize(9);
        doc.setTextColor(110);
        doc.text("Month", M + 2, y);
        doc.text("People brought", 70, y);
        doc.text("Earned", 150, y);
        doc.setTextColor(0);
        y += 3;
        doc.setDrawColor(210);
        doc.line(M, y, 196, y);
        y += 6;
        doc.setFontSize(10);
        for (const m of d.months) {
          if (y > 265) { doc.addPage(); y = 20; }
          doc.text(m.month, M + 2, y);
          doc.text(String(m.people), 70, y);
          doc.text(naira(m.earned), 150, y);
          y += 7;
        }
      }

      // Payouts
      if (d.payouts.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        y += 5;
        doc.setFontSize(12);
        doc.text("What we have paid you", M, y);
        y += 8;
        doc.setFontSize(10);
        for (const p of d.payouts) {
          if (y > 275) { doc.addPage(); y = 20; }
          const when = new Date(p.paid_at).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
          });
          doc.setTextColor(70);
          doc.text(`${when}  ·  ${p.count} payment${p.count === 1 ? "" : "s"}`, M + 2, y);
          doc.setTextColor(0);
          doc.text(naira(p.amount), 150, y);
          y += 7;
        }
      }

      // How it works, so the number is never a mystery.
      if (y > 250) { doc.addPage(); y = 20; }
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(
        `You earn ${Math.round(COMMISSION_RATE * 100)}% of every payment a person you brought makes, for up to ${COMMISSION_CAP} payments each.`,
        M,
        y,
      );
      y += 5;
      doc.text("Glufloat costs N1,500 a month, so that is N600 to you each time they pay.", M, y);

      // The privacy line, said out loud.
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        "This report shows counts and money only. Glufloat never shares the name, email or any detail of the people you refer.",
        M,
        288,
      );

      const slug = `${d.partner.code}-${d.period.label.replace(/\s+/g, "-").toLowerCase()}`;
      doc.save(`glufloat-partner-${slug}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={make}
      disabled={busy}
      title={`PDF report for ${partnerName}`}
      className={
        small
          ? "text-xs text-ink-soft underline hover:text-brand disabled:opacity-40"
          : "rounded-full border-2 border-line bg-white px-5 py-2.5 font-display font-bold text-ink transition-colors hover:border-brand disabled:opacity-50"
      }
    >
      {busy ? "Building..." : small ? "Report" : "Download their report"}
    </button>
  );
}
