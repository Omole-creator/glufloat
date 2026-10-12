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

export async function notifyFounder(subject: string, rows: [string, string | null | undefined][], link: string): Promise<boolean> {
  const key = process.env.MAILYTE_SEND_KEY || process.env.MAILYTE_API_KEY;
  if (!key) return false;
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
    return res.ok;
  } catch {
    return false;
  }
}
