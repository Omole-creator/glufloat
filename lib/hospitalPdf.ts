"use client";

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { ANNUAL_MONTHS_PAID, planName } from "@/lib/hospitalPlans";
import type { InvoiceSettings } from "@/lib/invoiceSettings";
import { SITE_URL } from "@/lib/site";

/**
 * The three PDFs a hospital receives, drawn in the browser with jsPDF (the
 * same library as the doctor's report): a quote, an invoice, and the A4 poster
 * with the QR code patients scan to join.
 *
 * jsPDF's built-in fonts cannot draw the naira sign, so money is written
 * "NGN 100,000", which is also how a Nigerian bank statement writes it.
 */

const BRAND: [number, number, number] = [27, 95, 170];
const BRAND_DEEP: [number, number, number] = [11, 46, 89];
const INK: [number, number, number] = [12, 42, 71];
const SOFT: [number, number, number] = [70, 97, 122];
const MIST: [number, number, number] = [238, 245, 252];
const LEAF: [number, number, number] = [62, 155, 79];

export type HospitalForPdf = {
  name: string;
  code: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
};

export type DocumentForPdf = {
  number: string;
  kind: "quote" | "invoice";
  plan: string;
  seats: number;
  billing: "monthly" | "annual";
  months: number;
  amount: number; // kobo
  vat_rate: number;
  notes: string | null;
  issued_on: string;
  due_on: string | null;
  status: "open" | "paid" | "void";
  paid_on: string | null;
};

export function ngn(kobo: number): string {
  return `NGN ${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function niceDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The logo, shrunk to 160px first: the full-size file made every PDF 1MB+. */
async function logoDataUrl(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = "/logo-mark.png";
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    c.getContext("2d")?.drawImage(img, 0, 0, 160, 160);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function joinUrl(code: string): string {
  return `${SITE_URL}/j/${code}`;
}

/** The short form people type: glufloat.com/j/4KQ7MD */
export function joinShort(code: string): string {
  return `${SITE_URL.replace(/^https?:\/\/(www\.)?/, "")}/j/${code}`;
}

export async function buildDocumentPdf(
  doc: DocumentForPdf,
  hospital: HospitalForPdf,
  bank: InvoiceSettings,
): Promise<jsPDF> {
  const pdf = new jsPDF({ compress: true });
  const M = 16;
  const W = 210;
  const logo = await logoDataUrl();
  const isInvoice = doc.kind === "invoice";

  // Header band.
  pdf.setFillColor(...BRAND);
  pdf.rect(0, 0, W, 34, "F");
  if (logo) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(M, 9, 16, 16, 3, 3, "F");
    pdf.addImage(logo, "PNG", M + 2, 11, 12, 12);
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("GluFloat", M + 21, 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.text("GluFloat for hospitals", M + 21, 23);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(isInvoice ? "INVOICE" : "QUOTE", W - M, 18, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.text(doc.number, W - M, 25, { align: "right" });

  // Bill to / dates.
  let y = 48;
  pdf.setTextColor(...SOFT);
  pdf.setFontSize(8.5);
  pdf.text(isInvoice ? "BILL TO" : "PREPARED FOR", M, y);
  pdf.text("DETAILS", 120, y);
  y += 6;
  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(pdf.splitTextToSize(hospital.name, 95), M, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  const who = [
    hospital.contact_name,
    [hospital.city, hospital.state].filter(Boolean).join(", "),
    hospital.contact_phone,
    hospital.contact_email,
  ].filter((x): x is string => !!x && x.trim().length > 0);
  who.forEach((line, i) => pdf.text(line, M, y + 6 + i * 5));

  const details: [string, string][] = [
    ["Date", niceDate(doc.issued_on)],
    [isInvoice ? "Pay by" : "Valid until", niceDate(doc.due_on)],
  ];
  if (doc.status === "paid") details.push(["Paid on", niceDate(doc.paid_on)]);
  details.forEach(([k, v], i) => {
    pdf.setTextColor(...SOFT);
    pdf.text(k, 120, y + i * 6);
    pdf.setTextColor(...INK);
    pdf.text(v, W - M, y + i * 6, { align: "right" });
  });

  // The line.
  y = 92;
  pdf.setFillColor(...MIST);
  pdf.rect(M, y, W - 2 * M, 9, "F");
  pdf.setTextColor(...SOFT);
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("DESCRIPTION", M + 3, y + 6);
  pdf.text("AMOUNT", W - M - 3, y + 6, { align: "right" });

  const subtotal = Math.round(doc.amount / (1 + Number(doc.vat_rate || 0)));
  const vat = doc.amount - subtotal;
  y += 16;
  pdf.setTextColor(...INK);
  pdf.setFontSize(11);
  pdf.text(`GluFloat ${planName(doc.plan)}`, M + 3, y);
  pdf.text(ngn(subtotal), W - M - 3, y, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...SOFT);
  const period =
    doc.billing === "annual"
      ? `12 months of access, paid yearly (12 months for the price of ${ANNUAL_MONTHS_PAID})`
      : "1 month of access, paid monthly";
  const desc = [
    `Up to ${doc.seats} patients, each with everything in GluFloat Premium`,
    period,
    "Dashboard for your doctors and dietitians, free",
  ];
  desc.forEach((line, i) => pdf.text(line, M + 3, y + 6 + i * 5));
  y += 6 + desc.length * 5 + 4;
  pdf.setDrawColor(217, 230, 242);
  pdf.line(M, y, W - M, y);

  // Totals.
  y += 8;
  const row = (k: string, v: string, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 12 : 10);
    pdf.setTextColor(...(bold ? INK : SOFT));
    pdf.text(k, 130, y);
    pdf.text(v, W - M - 3, y, { align: "right" });
    y += bold ? 8 : 6;
  };
  row("Subtotal", ngn(subtotal));
  if (vat > 0) row(`VAT (${(Number(doc.vat_rate) * 100).toFixed(1)}%)`, ngn(vat));
  row(isInvoice ? "Total to pay" : "Total", ngn(doc.amount), true);

  if (doc.status === "paid") {
    pdf.setFillColor(...LEAF);
    pdf.roundedRect(M, y - 14, 34, 10, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("PAID", M + 17, y - 7.2, { align: "center" });
  }

  // How to pay.
  y += 8;
  if (bank.accountNumber) {
    pdf.setFillColor(...MIST);
    pdf.roundedRect(M, y, W - 2 * M, 34, 3, 3, "F");
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text("How to pay: bank transfer", M + 5, y + 8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    const lines: [string, string][] = [
      ["Bank", bank.bankName],
      ["Account name", bank.accountName],
      ["Account number", bank.accountNumber],
    ];
    lines.forEach(([k, v], i) => {
      pdf.setTextColor(...SOFT);
      pdf.text(k, M + 5, y + 15 + i * 5.5);
      pdf.setTextColor(...INK);
      pdf.setFont("helvetica", "bold");
      pdf.text(v, M + 42, y + 15 + i * 5.5);
      pdf.setFont("helvetica", "normal");
    });
    pdf.setTextColor(...SOFT);
    pdf.setFontSize(8.5);
    pdf.text(`Please write ${doc.number} as the transfer description.`, M + 5, y + 31);
    y += 42;
  }

  if (doc.notes) {
    pdf.setTextColor(...SOFT);
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(doc.notes, W - 2 * M);
    pdf.text(lines, M, y);
    y += lines.length * 4.5;
  }

  // Signed, bottom right, above the footer.
  if (bank.signature || bank.signName) {
    const sx = W - M - 62;
    const sy = Math.max(y + 8, 236);
    if (bank.signature) {
      try {
        const props = pdf.getImageProperties(bank.signature);
        const h = 18;
        const w = Math.min(60, (props.width / props.height) * h);
        pdf.addImage(bank.signature, "PNG", sx, sy, w, h);
      } catch {
        /* a broken image is left out, never a broken PDF */
      }
    }
    pdf.setDrawColor(200, 210, 222);
    pdf.line(sx, sy + 20, W - M, sy + 20);
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(bank.signName || "GluFloat", sx, sy + 25.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...SOFT);
    if (bank.signTitle) pdf.text(bank.signTitle, sx, sy + 30);
  }

  // Footer.
  pdf.setDrawColor(217, 230, 242);
  pdf.line(M, 280, W - M, 280);
  pdf.setTextColor(...SOFT);
  pdf.setFontSize(8.5);
  pdf.text("GluFloat  ·  www.glufloat.com  ·  care@glufloat.com", W / 2, 286, { align: "center" });
  return pdf;
}

/** The A4 poster for the clinic wall: scan, or type the short address. */
export async function buildPosterPdf(hospital: { name: string; code: string }): Promise<jsPDF> {
  const pdf = new jsPDF({ compress: true });
  const W = 210;
  const H = 297;
  const logo = await logoDataUrl();
  const url = joinUrl(hospital.code);
  const qr = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
    color: { dark: "#0b2e59", light: "#ffffff" },
  });

  // Deep blue top.
  pdf.setFillColor(...BRAND_DEEP);
  pdf.rect(0, 0, W, 112, "F");
  pdf.setFillColor(...BRAND);
  pdf.circle(W - 10, 10, 60, "F");
  pdf.setFillColor(...BRAND_DEEP);
  pdf.circle(W - 10, 10, 44, "F");

  if (logo) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(18, 18, 18, 18, 4, 4, "F");
    pdf.addImage(logo, "PNG", 20.5, 20.5, 13, 13);
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("GluFloat", 41, 30);

  pdf.setFontSize(30);
  const title = pdf.splitTextToSize("Know what to eat for your diabetes", W - 36);
  pdf.text(title, 18, 56);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  const sub = pdf.splitTextToSize(
    // Never "free": the hospital may charge its patients for the programme.
    `${hospital.name} gives you GluFloat. It tells you what to eat and how much, and keeps a report for your doctor.`,
    W - 36,
  );
  pdf.text(sub, 18, 56 + title.length * 12 + 4);

  // The QR code card.
  const size = 82;
  const qx = (W - size) / 2;
  const qy = 122;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(217, 230, 242);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(qx - 8, qy - 8, size + 16, size + 16, 6, 6, "FD");
  pdf.addImage(qr, "PNG", qx, qy, size, size);

  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Point your phone camera at this code", W / 2, qy + size + 19, { align: "center" });

  // The no-camera route, big enough to read across a waiting room.
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(...SOFT);
  pdf.text("No camera? Type this in your phone's browser:", W / 2, qy + size + 29, { align: "center" });
  pdf.setFillColor(...MIST);
  pdf.roundedRect(30, qy + size + 34, W - 60, 17, 4, 4, "F");
  pdf.setTextColor(...BRAND);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(joinShort(hospital.code), W / 2, qy + size + 45.5, { align: "center" });

  // Steps.
  const steps = ["Open the link", "Put your name, phone number and a password", "Start using GluFloat"];
  // Below the address box (which ends at qy + size + 51 = 255).
  const sy = H - 27;
  const colW = (W - 36) / 3;
  steps.forEach((s, i) => {
    const x = 18 + i * colW;
    pdf.setFillColor(...LEAF);
    pdf.circle(x + 5, sy - 1.5, 5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(String(i + 1), x + 5, sy - 1.5, { align: "center", baseline: "middle" });
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(s, colW - 16), x + 13, sy);
  });
  pdf.setTextColor(...SOFT);
  pdf.setFontSize(9.5);
  pdf.text("Need help? Call customer care on 08132097317.", W / 2, H - 10, { align: "center" });
  return pdf;
}
