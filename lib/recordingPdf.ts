"use client";

import { jsPDF } from "jspdf";
import {
  callLength,
  clock,
  speakerName,
  type CallLine,
  type CallSession,
} from "./recordingTypes";

const BRAND = [27, 95, 170] as const; // --blue
const LEAF = [46, 139, 87] as const;
const INK = [12, 42, 71] as const;

/**
 * One PDF for one call or many. Each call starts on a new page with the
 * customer's name, the purpose, the date and the length, then the labelled
 * transcript, each line with its time into the call.
 */
export function buildTranscriptPdf(calls: { session: CallSession; lines: CallLine[] }[]): jsPDF {
  const doc = new jsPDF();
  const M = 16;
  const W = 210 - M * 2;
  let y = 0;

  const footer = () => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("GluFloat customer call transcript. For internal use.", M, 290);
  };
  const newPage = () => {
    doc.addPage();
    y = 20;
  };
  const room = (h: number) => {
    if (y + h > 280) {
      footer();
      newPage();
    }
  };

  calls.forEach(({ session: s, lines }, i) => {
    if (i > 0) {
      footer();
      newPage();
    } else {
      y = 20;
    }

    // Header band
    doc.setFillColor(...BRAND);
    doc.roundedRect(M - 2, y - 8, W + 4, 30, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(s.customer_name, M + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const purpose = doc.splitTextToSize(`Purpose: ${s.purpose}`, W - 4);
    doc.text(purpose.slice(0, 2), M + 2, y + 7);
    const when = new Date(s.started_at ?? s.created_at).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const len = callLength(s);
    doc.text(`${when}${len !== null ? `   ·   Length ${clock(len)}` : ""}   ·   ${lines.length} lines`, M + 2, y + 18);
    y += 32;

    if (lines.length === 0) {
      doc.setTextColor(120);
      doc.setFontSize(10);
      doc.text("No transcript for this call.", M, y);
      y += 8;
      return;
    }

    for (const l of lines) {
      const who = speakerName(l.speaker, s.customer_name);
      doc.setFontSize(10);
      const body = doc.splitTextToSize(l.text, W - 30);
      room(6 + body.length * 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140);
      doc.text(clock(l.t_ms), M, y);
      doc.setFont("helvetica", "bold");
      if (l.speaker === "glufloat") doc.setTextColor(...BRAND);
      else doc.setTextColor(...LEAF);
      doc.text(who, M + 16, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK);
      doc.text(body, M + 16, y + 5);
      y += 6 + body.length * 5 + 2;
    }
  });

  footer();
  return doc;
}

export function transcriptFileName(calls: { session: CallSession }[]): string {
  const day = new Date().toISOString().slice(0, 10);
  if (calls.length === 1) {
    const name = calls[0].session.customer_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `glufloat-call-${name || "customer"}-${day}.pdf`;
  }
  return `glufloat-calls-${calls.length}-${day}.pdf`;
}
