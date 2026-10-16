/**
 * One email to the founder when a hospital asks for a pilot or a quote
 * (founder, 2026-10-12: "make sure I receive quote notification here").
 *
 * Sent through Mailyte's application mail (`POST /messages`), NOT a campaign.
 * That needs a key with the `messages:send` permission. The key used for the
 * newsletter (MAILYTE_API_KEY) does not have it, and Mailyte keys cannot be
 * changed, so this reads MAILYTE_SEND_KEY first. Server only.
 *
 * It never throws and never makes the hospital wait: if the email cannot go,
 * the request is still saved and still shows in /admin/hospitals.
 */
const API = "https://app.mailyte.com/api/v1";
export const FOUNDER_INBOX = "glufloat@gmail.com";
const FROM = "care@glufloat.com";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export type NotifyResult = { ok: boolean; status: number | null; detail: string };

/**
 * One email to one person through Mailyte's application mail (the same
 * sender as the founder alert below). Never throws; the caller decides what
 * to show when it did not go.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string, tag: string): Promise<NotifyResult> {
  const key = process.env.MAILYTE_SEND_KEY || process.env.MAILYTE_API_KEY;
  if (!key) return { ok: false, status: null, detail: "No Mailyte key is set on the server." };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: [to], from: FROM, subject, html, text, tags: [tag] }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) return { ok: true, status: res.status, detail: "Sent." };
    const j = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, status: res.status, detail: j.message ?? res.statusText };
  } catch (e) {
    return { ok: false, status: null, detail: e instanceof Error ? e.message : "Could not reach Mailyte." };
  }
}

/**
 * The email a hospital gets the moment it asks for the free pilot (founder,
 * 2026-10-16: no waiting for GluFloat, no WhatsApp step). The button is its
 * admin invite link, the same one /admin/hospitals makes.
 */
export function pilotEmail(firstName: string, hospital: string, link: string, days: number, seats: number, inviteDays: number) {
  const subject = `Set up your GluFloat dashboard for ${hospital}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#0c2a47;max-width:560px">
<div style="background:#1b5faa;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:20px;font-weight:bold">GluFloat for hospitals</div>
<div style="border:1px solid #e3e9f1;border-top:0;border-radius:0 0 14px 14px;padding:22px">
<p style="margin:0 0 12px;font-size:16px">Hello ${esc(firstName)},</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5">Your free ${days}-day pilot for <b>${esc(hospital)}</b> has started. It covers ${seats} patients. You do not pay anything to start.</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.5">Tap the button to set up your dashboard. Then add your patients.</p>
<p style="margin:0 0 18px"><a href="${esc(link)}" style="background:#3e9b4f;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:bold;font-size:16px">Set up my dashboard</a></p>
<p style="margin:0 0 8px;font-size:14px;color:#46617a;line-height:1.5">This link works for ${inviteDays} days. Do not share it. It opens your hospital's patient records.</p>
<p style="margin:0;font-size:14px;color:#46617a">Need help? Call or WhatsApp us on 0813 209 7317.</p>
</div></div>`;
  const text = `Hello ${firstName},

Your free ${days}-day pilot for ${hospital} has started. It covers ${seats} patients. You do not pay anything to start.

Open this link to set up your dashboard. Then add your patients:
${link}

This link works for ${inviteDays} days. Do not share it. It opens your hospital's patient records.

Need help? Call or WhatsApp us on 0813 209 7317.`;
  return { subject, html, text };
}

export async function notifyFounder(subject: string, rows: [string, string | null | undefined][], link: string): Promise<NotifyResult> {
  const key = process.env.MAILYTE_SEND_KEY || process.env.MAILYTE_API_KEY;
  if (!key) return { ok: false, status: null, detail: "No Mailyte key is set on the server." };
  const shown = rows.filter(([, v]) => v && String(v).trim());
  const html = `<div style="font-family:Arial,sans-serif;color:#0c2a47">
<h2 style="margin:0 0 12px;color:#1b5faa">${esc(subject)}</h2>
<table style="border-collapse:collapse">${shown
    .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#46617a">${esc(k)}</td><td style="padding:4px 0;font-weight:bold">${esc(String(v))}</td></tr>`)
    .join("")}</table>
<p style="margin-top:18px"><a href="${esc(link)}" style="background:#3e9b4f;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open in GluFloat admin</a></p>
</div>`;
  const text = `${subject}\n\n${shown.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${link}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: [FOUNDER_INBOX], from: FROM, subject, html, text, tags: ["hospital-request"] }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) return { ok: true, status: res.status, detail: "Sent." };
    const j = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, status: res.status, detail: j.message ?? res.statusText };
  } catch (e) {
    return { ok: false, status: null, detail: e instanceof Error ? e.message : "Could not reach Mailyte." };
  }
}
