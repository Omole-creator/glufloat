"use client";

import { useEffect, useState } from "react";
import { Download, Droplet, Plus, Trash2, ClipboardList } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  INTAKE_CHANGED,
  monthChecks,
  deleteCheck,
  type CheckedMeal,
} from "@/lib/history";
import { groupByWeek } from "@/lib/weeks";
import { monthReportMessage } from "@/lib/shareMessage";
import { sizedFoods } from "@/lib/mealSize";
import { trackUsage } from "@/lib/usage";
import { displayLabel } from "@/lib/foodName";
import { type Reading, formatBoth, gapLabel, readingWhen } from "@/lib/glucose";
import {
  READINGS_CHANGED,
  askForReading,
  deleteReading,
  looseMonthReadings,
} from "@/lib/glucoseLog";
import { type Hba1c, deleteHba1c, formatHba1c, latestHba1c } from "@/lib/hba1c";
import { formatChange, mealTestNumber, minutesLabel } from "@/lib/mealResponse";
import { mealTestReport, periodLabel, trendPoints } from "@/lib/mealTestReport";
import { accessOnce } from "@/lib/useAccess";
import CollapsibleCard from "./CollapsibleCard";
import SugarTrend from "./SugarTrend";

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
 * "What you ate this month" — the record a person hands their doctor. It carries
 * only meals the person actually TOLD us they ate (via "I ate this" / "I ate this
 * meal"), never everything they searched or the app suggested, because a lookup
 * is not a meal. Each entry can be deleted. It shows how much of each food (the
 * size), then generates a Glufloat brand-coloured PDF and sends it straight to
 * the doctor on WhatsApp (the phone's share sheet attaches the real file).
 */
export default function MonthReport({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const [items, setItems] = useState<CheckedMeal[] | null>(null);
  const [loose, setLoose] = useState<Reading[]>([]);
  // The newest 3-month sugar test, whenever it was taken: it covers months,
  // not days, so it is not cut to this month like everything else here.
  const [hba1c, setHba1c] = useState<Hba1c | null>(null);
  const [busy, setBusy] = useState(false);
  // The patient's name heads the report (founder's call, 2026-10-07): it goes
  // to their own doctor, who needs to know whose numbers these are.
  const [patient, setPatient] = useState<string | null>(null);
  useEffect(() => {
    void accessOnce()
      .then((a) => setPatient(a.name))
      .catch(() => setPatient(null));
  }, []);

  /**
   * Re-read whenever the record changes, not only on mount.
   *
   * This card mounts once with the page and used to fetch once, so ANYTHING
   * logged afterwards was invisible until a reload. Somebody who tapped "I ate
   * this" and then opened the report was told they had saved nothing, and
   * somebody who had just saved a reading was shown a meal with no reading on it.
   * Both read as "it did not work".
   *
   * INTAKE_CHANGED fires from saveCheck (a meal), READINGS_CHANGED from
   * saveReading and deleteReading.
   */
  useEffect(() => {
    const load = () => {
      void monthChecks().then(setItems);
      void looseMonthReadings().then(setLoose);
      void latestHba1c().then(setHba1c);
    };
    load();
    window.addEventListener(READINGS_CHANGED, load);
    window.addEventListener(INTAKE_CHANGED, load);
    return () => {
      window.removeEventListener(READINGS_CHANGED, load);
      window.removeEventListener(INTAKE_CHANGED, load);
    };
  }, []);

  // The card ALWAYS shows (so people can always find it); an empty state stands
  // in until they have logged a meal.
  const list = items ?? [];
  // A reading on its own is a report too. Somebody who tests first thing in the
  // morning and logs nothing else still has something worth handing over.
  const hasData = list.length > 0 || loose.length > 0 || hba1c !== null;
  const anyReadings =
    loose.length > 0 ||
    hba1c !== null ||
    list.some((i) => i.readings.length > 0 || i.beforeReadings.length > 0);
  // The dietitian's Meal–Glucose Report: one builder for screen, PDF and text.
  const report = mealTestReport(list);
  const points = trendPoints(list, loose);
  const period = periodLabel();
  const tally = (items: CheckedMeal[]) => ({
    total: items.length,
    green: items.filter((i) => i.verdict === "green").length,
    yellow: items.filter((i) => i.verdict === "yellow").length,
    red: items.filter((i) => i.verdict === "red").length,
  });
  const counts = tally(list);
  // A doctor reads a month as weeks. Monday to Sunday, newest week first.
  const weeks = groupByWeek(list, (i) => i.checkedAt);

  const remove = (id: number) => {
    setItems((cur) => (cur ? cur.filter((i) => i.id !== id) : cur));
    void deleteCheck(id);
  };

  /**
   * Remove one reading.
   *
   * A number typed wrong has to be removable, and this is the only place it can
   * be done. Someone meaning 6.5 who types 65 has put a wrong figure on a record
   * a doctor will read, and it also drags their own usual number about, which is
   * what the pattern line compares against. A meal can be deleted, so a reading
   * must be too.
   */
  const removeReading = (id: number) => {
    setItems((cur) =>
      cur
        ? cur.map((i) => ({
            ...i,
            readings: i.readings.filter((r) => r.id !== id),
            beforeReadings: i.beforeReadings.filter((r) => r.id !== id),
          }))
        : cur,
    );
    setLoose((cur) => cur.filter((r) => r.id !== id));
    void deleteReading(id);
  };

  /** One bin, used on an attached reading and on a loose one. */
  const ReadingBin = ({ r }: { r: Reading }) => (
    <button
      onClick={() => removeReading(r.id)}
      // Named by its own value and moment, so no two bins on the page share an
      // accessible name (a real problem for a screen reader, and it fails
      // Playwright's strict mode).
      aria-label={`Remove the ${formatBoth(r.mgdl)} sugar test, ${readingWhen(r.takenAt)}`}
      className="shrink-0 rounded-full p-0.5 text-ink-soft/50 transition-colors hover:bg-verdict-red/10 hover:text-verdict-red"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );

  const fileName = `glufloat-food-record-${new Date().toISOString().slice(0, 10)}.pdf`;

  // Build the branded PDF. Returns the jsPDF doc so it can be shared or saved.
  const buildDoc = () => {
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
    doc.text(
      report.rows.length > 0 ? "Meal-Glucose Report for the doctor" : "Food record for the doctor",
      M,
      23,
    );

    ink(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(
      anyReadings
        ? "What I ate this month, and what my sugar was"
        : "What I ate this month, and how much",
      M,
      44,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    ink(INK);
    doc.text(patient ? `Patient: ${patient}    Period: ${period}` : `Period: ${period}`, M, 51);
    doc.setTextColor(110);
    doc.text(
      `${counts.total} ${counts.total === 1 ? "meal" : "meals"}  ·  prepared ${new Date().toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "long", year: "numeric" },
      )}`,
      M,
      57,
    );

    // Three colour count boxes.
    const boxW = 58;
    const gap = 6;
    const boxY = 64;
    const boxes: [keyof typeof V, number][] = [
      ["green", counts.green],
      ["yellow", counts.yellow],
      ["red", counts.red],
    ];
    boxes.forEach(([k, n], i) => {
      const x = M + i * (boxW + gap);
      fill(TINT[k]);
      doc.roundedRect(x, boxY, boxW, 22, 2, 2, "F");
      fill(V[k]);
      doc.rect(x, boxY, boxW, 2.5, "F");
      ink(INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(String(n), x + 5, boxY + 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(MEANING[k], x + 5, boxY + 18);
    });

    let y = 98;
    const nextPageIfNeeded = (limit: number) => {
      if (y > limit) {
        doc.addPage();
        y = 20;
      }
    };
    const band = (title: string, note?: string) => {
      nextPageIfNeeded(255);
      fill([235, 242, 250]);
      doc.roundedRect(M - 2, y - 5, 182, 9, 1.5, 1.5, "F");
      ink(BRAND);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(title, M + 1, y + 1);
      if (note) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(90);
        doc.text(note, M + 75, y + 1);
      }
      y += 12;
    };

    // ---- The Meal-Glucose Report (the dietitian's design) -----------------
    // Each meal with its own sugar before, 2 hours after, and the change. Only
    // numbers: no colour on a test and no word about whether it is good.
    if (report.rows.length > 0) {
      band(
        "Meals with sugar tests",
        `${report.stats.meals} ${report.stats.meals === 1 ? "meal" : "meals"} recorded  ·  ${report.stats.complete} complete meal and sugar ${report.stats.complete === 1 ? "record" : "records"}`,
      );
      const col = { date: M, meal: M + 20, before: 124, after: 146, change: 172 };
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text("Date", col.date, y);
      doc.text("Meal and how much", col.meal, y);
      doc.text("Before", col.before, y);
      doc.text("2h after", col.after, y);
      doc.text("Change", col.change, y);
      y += 2;
      doc.setDrawColor(220);
      doc.line(M, y, M + 180, y);
      y += 5;
      for (const r of report.rows) {
        const mealLines = (doc.splitTextToSize(r.shown, 100) as string[]).slice(0, 2);
        const portionLines = (doc.splitTextToSize(r.portion, 100) as string[]).slice(0, 2);
        nextPageIfNeeded(280 - (mealLines.length + portionLines.length) * 4);
        const top = y;
        ink(INK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(r.date, col.date, top);
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text(r.time, col.date, top + 4);
        ink(INK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        mealLines.forEach((l, k) => doc.text(l, col.meal, top + k * 4.2));
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(110);
        portionLines.forEach((l, k) =>
          doc.text(l, col.meal, top + mealLines.length * 4.2 + k * 3.6),
        );
        ink(INK);
        doc.setFontSize(9);
        doc.text(r.before !== null ? String(Math.round(r.before)) : "-", col.before, top);
        doc.text(r.after !== null ? String(Math.round(r.after)) : "-", col.after, top);
        if (r.after !== null && !r.complete && r.minutesAfter !== null) {
          doc.setFontSize(7.5);
          doc.setTextColor(120);
          doc.text(`at ${minutesLabel(r.minutesAfter)}`, col.after, top + 4);
          ink(INK);
          doc.setFontSize(9);
        }
        doc.setFont("helvetica", "bold");
        doc.text(r.change !== null ? formatChange(r.change).replace(" mg/dL", "") : "-", col.change, top);
        doc.setFont("helvetica", "normal");
        y = top + Math.max(8, mealLines.length * 4.2 + portionLines.length * 3.6 + 2);
        doc.setDrawColor(238);
        doc.line(M, y - 3, M + 180, y - 3);
        y += 1;
      }
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text("All sugar numbers in mg/dL. A dash means no test was saved.", M, y);
      y += 8;
    }

    // ---- The sugar trend, every test this month as one line -------------
    if (points.length >= 2) {
      nextPageIfNeeded(215);
      band("My sugar tests this month", `${points.length} tests, mg/dL`);
      const gx = M + 12;
      const gw = 166;
      const gh = 40;
      const gy = y;
      const ts = points.map((p) => new Date(p.takenAt).getTime());
      const t0 = Math.min(...ts);
      const t1 = Math.max(...ts);
      const vs = points.map((p) => p.mgdl);
      const lo = Math.floor((Math.min(...vs) - 10) / 20) * 20;
      const hi = Math.ceil((Math.max(...vs) + 10) / 20) * 20;
      const px = (t: number) => gx + ((t - t0) / Math.max(1, t1 - t0)) * gw;
      const py = (v: number) => gy + (1 - (v - lo) / Math.max(1, hi - lo)) * gh;
      doc.setDrawColor(225);
      doc.setLineWidth(0.2);
      doc.setFontSize(7);
      doc.setTextColor(120);
      for (const v of [lo, Math.round((lo + hi) / 2), hi]) {
        doc.line(gx, py(v), gx + gw, py(v));
        doc.text(String(v), gx - 2, py(v) + 1, { align: "right" });
      }
      doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
      doc.setLineWidth(0.6);
      for (let k = 1; k < points.length; k++) {
        doc.line(px(ts[k - 1]), py(vs[k - 1]), px(ts[k]), py(vs[k]));
      }
      fill(BRAND);
      for (let k = 0; k < points.length; k++) doc.circle(px(ts[k]), py(vs[k]), 0.9, "F");
      doc.setLineWidth(0.2);
      doc.setTextColor(120);
      doc.text(readingWhen(points[0].takenAt), gx, gy + gh + 5);
      doc.text(readingWhen(points[points.length - 1].takenAt), gx + gw, gy + gh + 5, { align: "right" });
      y = gy + gh + 13;
    }

    // ---- Meal pattern and observations ------------------------------------
    if (report.rows.length > 0 && report.pattern.length > 0) {
      band("Meals logged most often");
      doc.setFontSize(9);
      ink(INK);
      for (const p of report.pattern) {
        nextPageIfNeeded(285);
        doc.text(`${p.shown}: ${p.count} ${p.count === 1 ? "time" : "times"}`, M + 2, y);
        y += 5;
      }
      y += 4;
    }
    if (report.observations.length > 0) {
      band("What the records show");
      doc.setFontSize(9);
      report.observations.forEach((o, k) => {
        const last = k === report.observations.length - 1;
        doc.setTextColor(last ? 120 : 40);
        doc.setFont("helvetica", last ? "italic" : "normal");
        for (const line of doc.splitTextToSize(o, 176) as string[]) {
          nextPageIfNeeded(285);
          doc.text(line, M + 2, y);
          y += 4.6;
        }
        y += 1.5;
      });
      doc.setFont("helvetica", "normal");
      y += 4;
    }

    // The food list, each meal with the size of every food in it.
    nextPageIfNeeded(250);

    ink(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      anyReadings
        ? "Every meal I ate, week by week, with the size and my sugar tests"
        : "Every meal I ate, week by week, with the size",
      M,
      y,
    );
    y += 9;

    for (const week of weeks) {
      const wc = tally(week.items);
      nextPageIfNeeded(265);
      // The week band, so the doctor can see one week against the next.
      fill([235, 242, 250]);
      doc.roundedRect(M - 2, y - 5, 182, 9, 1.5, 1.5, "F");
      ink(BRAND);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(week.label, M + 1, y + 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(
        `${wc.total} ${wc.total === 1 ? "meal" : "meals"}  ·  ${wc.green} good  ·  ${wc.yellow} with care  ·  ${wc.red} to skip`,
        M + 60,
        y + 1,
      );
      y += 12;

      for (const it of week.items) {
        nextPageIfNeeded(272);
        const foods = sizedFoods(it.label, it.kind);

        fill(V[it.verdict]);
        doc.circle(M + 1.5, y - 1.4, 1.6, "F");
        ink(INK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const cleanLabel = displayLabel(it.label);
        doc.text(doc.splitTextToSize(cleanLabel, 120)[0] ?? cleanLabel, M + 6, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140);
        doc.setFontSize(9);
        doc.text(MEANING[it.verdict], 165, y);
        y += 6;

        doc.setFontSize(9);
        doc.setTextColor(90);
        for (const f of foods) {
          if (!f.size) continue;
          const label = it.kind === "single" ? f.size : `${f.name}: ${f.size}`;
          for (const wrapped of doc.splitTextToSize(label, 168) as string[]) {
            nextPageIfNeeded(285);
            doc.text(wrapped, M + 8, y);
            y += 5;
          }
        }

        // The person's own reading after this meal, in both units, with how long
        // after they tested. This is the line the doctor came for: it is the only
        // thing on the page that came from the patient's own body rather than
        // from us. Deliberately NOT graded, coloured or commented on. The number
        // and the timing, and the doctor reads it.
        for (const r of it.beforeReadings) {
          nextPageIfNeeded(285);
          ink(BRAND);
          doc.setFont("helvetica", "bold");
          doc.text(`Sugar test before eating: ${formatBoth(r.mgdl)}`, M + 8, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(90);
          y += 5;
        }
        for (const r of it.readings) {
          nextPageIfNeeded(285);
          const gap = gapLabel(it.startedAt ?? it.checkedAt, r.takenAt);
          const line = `Sugar test: ${formatBoth(r.mgdl)}${gap ? `, ${gap}` : ""}`;
          ink(BRAND);
          doc.setFont("helvetica", "bold");
          doc.text(line, M + 8, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(90);
          y += 5;
        }
        y += 3;
      }
      y += 4;
    }

    // Readings with no meal beside them. Their own block, in the same shape as a
    // week band, so they are plainly on the record and not hidden.
    if (loose.length > 0) {
      nextPageIfNeeded(255);
      fill([235, 242, 250]);
      doc.roundedRect(M - 2, y - 5, 182, 9, 1.5, 1.5, "F");
      ink(BRAND);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("My other sugar tests", M + 1, y + 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text("Not after a meal", M + 60, y + 1);
      y += 12;
      doc.setFontSize(9);
      for (const r of loose) {
        nextPageIfNeeded(285);
        ink(BRAND);
        doc.setFont("helvetica", "bold");
        doc.text(formatBoth(r.mgdl), M + 6, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110);
        doc.text(readingWhen(r.takenAt), 150, y);
        y += 5.5;
      }
      y += 4;
    }

    // The 3-month sugar test, as a plain number with its date. Never graded.
    if (hba1c) {
      nextPageIfNeeded(265);
      fill([235, 242, 250]);
      doc.roundedRect(M - 2, y - 5, 182, 9, 1.5, 1.5, "F");
      ink(BRAND);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("My 3-month sugar test (HbA1c)", M + 1, y + 1);
      y += 12;
      doc.setFontSize(9);
      doc.text(formatHba1c(hba1c), M + 6, y);
      doc.setFont("helvetica", "normal");
      y += 9;
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Made with Glufloat, which gives Nigerian foods a green, yellow or red rating for blood sugar.",
      M,
      290,
    );

    return doc;
  };

  // Generate the PDF, then hand it to WhatsApp (or any app) through the phone's
  // share sheet, which attaches the real file. On a device that cannot share a
  // file (most desktops) it downloads the PDF and opens WhatsApp with the text.
  const sendToDoctor = async () => {
    if (busy) return;
    setBusy(true);
    void trackUsage("doctor_report");
    try {
      const doc = buildDoc();
      const blob = doc.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data?: ShareData) => Promise<void>;
      };
      const payload = { files: [file] } as ShareData;
      if (nav.canShare?.(payload) && nav.share) {
        await nav.share({
          files: [file],
          title: "My Glufloat food record",
          text: "My food this month, from Glufloat.",
        } as ShareData);
        return;
      }
      doc.save(fileName);
      const text = monthReportMessage(
        counts,
        list.map((i) => ({
          label: i.label,
          verdict: i.verdict,
          kind: i.kind,
          checkedAt: i.checkedAt,
          readings: i.readings,
          beforeReadings: i.beforeReadings,
          startedAt: i.startedAt,
        })),
        loose,
        hba1c ? formatHba1c(hba1c) : null,
        { patient, period, report },
      );
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch {
      /* the person closed the share sheet; nothing to do */
    } finally {
      setBusy(false);
    }
  };

  const Tile = ({ n, label, dot }: { n: number; label: string; dot: string }) => (
    <div className="flex-1 rounded-2xl bg-mist/70 px-3 py-3 text-center ring-1 ring-ink/[0.04]">
      <p className="font-display text-2xl font-bold text-ink">{n}</p>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ink-soft">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </p>
    </div>
  );

  const monthYear = `${new Date().toLocaleDateString("en-US", { month: "short" })}, ${new Date().getFullYear()}`;

  return (
    <CollapsibleCard
      open={open}
      onToggle={onToggle}
      tone="blue"
      icon={<ClipboardList className="h-6 w-6" strokeWidth={2.2} />}
      header={
        open ? (
          <div>
            <p className="font-display text-base font-bold leading-snug text-ink">
              Generate food report for your next doctor appointment here
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              What you ate, {monthYear}
            </p>
          </div>
        ) : (
          // Not "Doctor's Report": the card that opens this one is called that,
          // and two buttons with the same name doing the same job is a trap for
          // anyone using a screen reader (and for the QA suite).
          <span className="font-display text-xl font-bold text-ink">
            What you ate this month
          </span>
        )
      }
    >
      {!hasData ? (
        <div className="rounded-2xl bg-mist/70 px-4 py-8 text-center ring-1 ring-ink/[0.04]">
          <p className="font-display text-base font-bold text-ink">
            No meals saved yet
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-soft">
            When you eat, open a food or your plate and tap{" "}
            <span className="font-semibold text-leaf-deep">
              &ldquo;I ate this&rdquo;
            </span>
            . It shows here, ready to send to your doctor.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            {anyReadings ? (
              <>
                These are the meals you told us you ate, with your own sugar
                tests beside them. Send them to your doctor so they see how you
                have been eating, and what your sugar did. Tap the bin to remove
                one.
              </>
            ) : (
              <>
                These are the meals you told us you ate. Send them to your doctor
                so they see how you have been eating, and how much. You can add a
                sugar test to any meal below. Tap the bin to remove one.
              </>
            )}
          </p>

          <div className="mt-4 flex gap-2.5">
            <Tile n={counts.green} label={MEANING.green} dot={DOT.green} />
            <Tile n={counts.yellow} label={MEANING.yellow} dot={DOT.yellow} />
            <Tile n={counts.red} label={MEANING.red} dot={DOT.red} />
          </div>

          {/* The Meal-Glucose Report on screen: the same rows, counts and
              observations as the PDF and the WhatsApp text
              (lib/mealTestReport.ts), so all three tell one story. */}
          {report.rows.length > 0 && (
            <div className="mt-4 rounded-2xl p-3 ring-1 ring-brand/15">
              <p className="font-display text-sm font-bold text-brand">Meals with sugar tests</p>
              <p className="text-xs text-ink-soft">
                {report.stats.meals} {report.stats.meals === 1 ? "meal" : "meals"} recorded ·{" "}
                {report.stats.complete} complete meal and sugar{" "}
                {report.stats.complete === 1 ? "record" : "records"}
              </p>
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {[...report.rows].reverse().map((r) => (
                  <li key={r.id} className="rounded-xl bg-mist/70 px-3 py-2.5">
                    <p className="text-xs text-ink-soft">
                      {r.date}, {r.time} · Record {mealTestNumber(r.id)}
                    </p>
                    <p className="text-sm font-bold text-ink">{r.shown}</p>
                    <p className="text-xs text-ink-soft">{r.portion}</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Before</p>
                        <p className="text-sm font-bold text-ink">{r.before !== null ? Math.round(r.before) : "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                          {r.after !== null && !r.complete && r.minutesAfter !== null
                            ? `${minutesLabel(r.minutesAfter)} after`
                            : "2h after"}
                        </p>
                        <p className="text-sm font-bold text-ink">{r.after !== null ? Math.round(r.after) : "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Change</p>
                        <p className="text-sm font-bold text-ink">
                          {r.change !== null ? formatChange(r.change).replace(" mg/dL", "") : "-"}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-ink-soft">
                Numbers in mg/dL. A dash means no test was saved.
              </p>
            </div>
          )}

          {points.length >= 2 && (
            <div className="mt-4 rounded-2xl p-3 ring-1 ring-brand/15">
              <SugarTrend points={points} />
            </div>
          )}

          {report.observations.length > 0 && (
            <div className="mt-4 rounded-2xl p-3 ring-1 ring-brand/15">
              <p className="font-display text-sm font-bold text-brand">What your records show</p>
              <ul className="mt-1.5 space-y-1.5 text-sm text-ink">
                {report.observations.slice(0, -1).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs italic text-ink-soft">
                {report.observations[report.observations.length - 1]}
              </p>
            </div>
          )}

          <div className="mt-4 max-h-64 space-y-4 overflow-y-auto border-t border-line pt-3 text-sm">
            {weeks.map((w) => {
              const wc = tally(w.items);
              return (
                <div key={w.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display text-sm font-bold text-brand">
                      {w.label}
                    </p>
                    <p className="text-xs font-semibold text-ink-soft">
                      {wc.green} good, {wc.yellow} with care, {wc.red} to skip
                    </p>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {w.items.map((i) => (
                      <li key={i.id} className="rounded-lg px-1 py-1.5 text-ink">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[i.verdict]}`}
                          />
                          <span className="flex-1 truncate">
                            {displayLabel(i.label)}
                          </span>
                          <button
                            onClick={() => remove(i.id)}
                            aria-label={`Remove ${i.label}`}
                            className="shrink-0 rounded-full p-1 text-ink-soft/50 transition-colors hover:bg-verdict-red/10 hover:text-verdict-red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {i.beforeReadings.map((r) => (
                          <p
                            key={r.id}
                            className="ml-5 mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand"
                          >
                            <Droplet className="h-3 w-3 shrink-0" />
                            {formatBoth(r.mgdl)}
                            <span className="font-normal text-ink-soft">before eating</span>
                            <ReadingBin r={r} />
                          </p>
                        ))}
                        {/* Their own number, said plainly, with no verdict on it. */}
                        {i.readings.map((r) => {
                          const gap = gapLabel(i.startedAt ?? i.checkedAt, r.takenAt);
                          return (
                            <p
                              key={r.id}
                              className="ml-5 mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand"
                            >
                              <Droplet className="h-3 w-3 shrink-0" />
                              {formatBoth(r.mgdl)}
                              {gap && (
                                <span className="font-normal text-ink-soft">
                                  {gap}
                                </span>
                              )}
                              <ReadingBin r={r} />
                            </p>
                          );
                        })}
                        {i.readings.length === 0 && (
                          <button
                            onClick={() =>
                              askForReading({
                                id: i.id,
                                label: i.label,
                                checkedAt: i.checkedAt,
                              })
                            }
                            // One of these per meal, so the name has to say WHICH
                            // meal. Two controls sharing an accessible name is
                            // useless to a screen reader and fails Playwright's
                            // strict mode, exactly like the bin above.
                            aria-label={`Add your sugar test for ${i.label} if any`}
                            // A bordered pill with a plus, not an underlined
                            // link. As a link nobody saw it as something to tap.
                            //
                            // "if any" is doing real work: a person who tests
                            // twice a week will see this on most of their meals,
                            // and without those two words a row per meal reads
                            // like a list of things they failed to do.
                            className="ml-5 mt-1 inline-flex items-center gap-1.5 rounded-full border-2 border-brand/30 bg-white px-3 py-1 text-xs font-bold text-brand transition-colors hover:border-brand hover:bg-brand/5"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                            Add your sugar test if any
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {hba1c && (
              <div>
                <p className="font-display text-sm font-bold text-brand">
                  My 3-month sugar test (HbA1c)
                </p>
                <div className="mt-1 flex items-center gap-2 px-1 py-1.5 text-xs font-semibold text-brand">
                  <Droplet className="h-3 w-3 shrink-0" />
                  {formatHba1c(hba1c)}
                  <button
                    onClick={() => {
                      void deleteHba1c(hba1c.id);
                      setHba1c(null);
                    }}
                    aria-label={`Remove the ${hba1c.percent}% 3-month sugar test`}
                    className="ml-auto shrink-0 rounded-full p-0.5 text-ink-soft/50 transition-colors hover:bg-verdict-red/10 hover:text-verdict-red"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Readings that follow no meal. On the record in their own right,
                because for somebody who tests first thing in the morning these
                may be all they have. */}
            {loose.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-sm font-bold text-brand">
                    My other sugar tests
                  </p>
                  <p className="text-xs font-semibold text-ink-soft">
                    Not after a meal
                  </p>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {loose.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-2 px-1 py-1.5 text-xs font-semibold text-brand"
                    >
                      <Droplet className="h-3 w-3 shrink-0" />
                      {formatBoth(r.mgdl)}
                      <span className="ml-auto font-normal text-ink-soft">
                        {readingWhen(r.takenAt)}
                      </span>
                      <ReadingBin r={r} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              onClick={sendToDoctor}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(37,211,102,0.8)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5c-.1-.2-.7-1.6-.9-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2A10 10 0 0 0 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 1 1-4.3 15.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 0 1 12 3.8" />
              </svg>
              {busy ? "Preparing..." : "Send to my doctor on WhatsApp"}
            </button>
            <button
              onClick={() => {
                void trackUsage("doctor_report");
                buildDoc().save(fileName);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-ink"
            >
              <Download className="h-4 w-4" /> Save the PDF
            </button>
          </div>
        </>
      )}
    </CollapsibleCard>
  );
}
