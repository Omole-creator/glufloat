import { NextResponse } from "next/server";
import { FOUNDER_INBOX, sendEmail } from "@/lib/notify";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/**
 * The contact form on /contact (founder, 2026-10-16): every message is
 * emailed to glufloat@gmail.com. Nothing is stored. If the email cannot go,
 * the visitor is told to call or WhatsApp instead, so no message is ever
 * silently lost.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // A hidden field people never see. A bot fills every box it finds.
  if (String(body.website ?? "").trim()) return NextResponse.json({ ok: true });

  const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const name = clip(body.name, 120);
  const reach = clip(body.reach, 200);
  const message = clip(body.message, 3000);
  if (!name) return NextResponse.json({ error: "Please put your name." }, { status: 400 });
  if (reach.length < 5) return NextResponse.json({ error: "Please put your email or phone number, so we can reply." }, { status: 400 });
  if (message.length < 2) return NextResponse.json({ error: "Please write your message." }, { status: 400 });

  const subject = `Contact form: ${name}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#0c2a47;max-width:560px">
<h2 style="margin:0 0 12px;color:#1b5faa">New message from the GluFloat contact page</h2>
<p style="margin:0 0 6px"><b>Name:</b> ${esc(name)}</p>
<p style="margin:0 0 14px"><b>Email or phone:</b> ${esc(reach)}</p>
<p style="margin:0;white-space:pre-wrap;line-height:1.5">${esc(message)}</p>
</div>`;
  const text = `New message from the GluFloat contact page\n\nName: ${name}\nEmail or phone: ${reach}\n\n${message}`;
  const sent = await sendEmail(FOUNDER_INBOX, subject, html, text, "contact-form");
  if (!sent.ok)
    return NextResponse.json(
      { error: "Your message did not send just now. Please call or WhatsApp us on 0904 874 4395 instead." },
      { status: 503 },
    );
  return NextResponse.json({ ok: true });
}
