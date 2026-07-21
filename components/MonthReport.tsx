"use client";

import { useEffect, useState } from "react";
import { Download, Trash2, ClipboardList } from "lucide-react";
import { jsPDF } from "jspdf";
import { monthChecks, deleteCheck, type MealCheck } from "@/lib/history";
import { monthReportMessage } from "@/lib/shareMessage";
import { sizedFoods } from "@/lib/mealSize";
import { trackUsage } from "@/lib/usage";
import { displayLabel } from "@/lib/foodName";
import CollapsibleCard from "./CollapsibleCard";

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
  const [items, setItems] = useState<MealCheck[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    monthChecks().then(setItems);
  }, []);

  // The card ALWAYS shows (so people can always find it); an empty state stands
  // in until they have logged a meal.
  const list = items ?? [];
  const hasData = list.length > 0;
  const counts = {
    total: list.length,
    green: list.filter((i) => i.verdict === "green").length,
    yellow: list.filter((i) => i.verdict === "yellow").length,
    red: list.filter((i) => i.verdict === "red").length,
  };

  const remove = (id: number) => {
    setItems((cur) => (cur ? cur.filter((i) => i.id !== id) : cur));
    void deleteCheck(id);
  };

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
    doc.text("Food record for the doctor", M, 23);

    ink(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("What I ate this month, and how much", M, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(
      `${counts.total} ${counts.total === 1 ? "meal" : "meals"}  ·  prepared ${new Date().toLocaleDateString(
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

    // The food list, each meal with the size of every food in it.
    let y = 92;
    ink(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Every meal I ate, with the size", M, y);
    y += 9;

    const nextPageIfNeeded = (limit: number) => {
      if (y > limit) {
        doc.addPage();
        y = 20;
      }
    };

    for (const it of list) {
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
      y += 3;
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
        list.map((i) => ({ label: i.label, verdict: i.verdict, kind: i.kind })),
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
          <span className="font-display text-xl font-bold text-ink">
            Doctor&apos;s Report
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
            These are the meals you told us you ate. Send them to your doctor so
            they see how you have been eating, and how much. Tap the bin to
            remove one.
          </p>

          <div className="mt-4 flex gap-2.5">
            <Tile n={counts.green} label={MEANING.green} dot={DOT.green} />
            <Tile n={counts.yellow} label={MEANING.yellow} dot={DOT.yellow} />
            <Tile n={counts.red} label={MEANING.red} dot={DOT.red} />
          </div>

          <ul className="mt-4 max-h-48 space-y-0.5 overflow-y-auto border-t border-line pt-3 text-sm">
            {list.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-ink"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[i.verdict]}`} />
                <span className="flex-1 truncate">{displayLabel(i.label)}</span>
                <button
                  onClick={() => remove(i.id)}
                  aria-label={`Remove ${i.label}`}
                  className="shrink-0 rounded-full p-1 text-ink-soft/50 transition-colors hover:bg-verdict-red/10 hover:text-verdict-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

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
