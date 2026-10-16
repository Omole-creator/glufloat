import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { newCode, readableToken } from "@/lib/hospitalServer";
import { PILOT_DAYS, PILOT_SEATS } from "@/lib/hospitalPlans";
import { normalizePhone } from "@/lib/phone";
import { notifyFounder, pilotEmail, sendEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const INVITE_DAYS = 14;

/**
 * A hospital asks for the free 30-day pilot, or for a quote, from /hospitals.
 *
 * A PILOT starts at once (founder, 2026-10-16): the hospital is saved as a
 * pilot, its admin invite link is made, and the link is emailed to the person
 * who asked, so they set up their dashboard without waiting for anybody. The
 * founder still gets an email, and can end a fake one from /admin/hospitals.
 * The same email asking again for the same hospital gets a fresh link to that
 * hospital, never a second pilot.
 *
 * A QUOTE still lands as "requested" and is answered by hand.
 *
 * Public, so it never reveals anything back except whether the email went.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // A hidden field people never see. A bot fills every box it finds.
  if (String(body.website ?? "").trim()) return NextResponse.json({ ok: true });

  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  const name = clip(body.hospital);
  const contactName = clip(body.contactName, 120);
  const contactRole = clip(body.contactRole, 80);
  const phone = normalizePhone(clip(body.phone, 40));
  const email = clip(body.email, 200).toLowerCase();
  const city = clip(body.city, 80);
  const state = clip(body.state, 80);
  const est = Number.parseInt(String(body.patients ?? ""), 10);
  // A quote (Care Custom) or a pilot. A quote is marked at the start of the
  // message, so it stands out in /admin/hospitals with no new column.
  const isQuote = body.kind === "quote";
  const typed = clip(body.message, 1000);
  const message = isQuote ? `QUOTE REQUEST. ${typed}`.trim() : typed;

  if (!name) return NextResponse.json({ error: "Please add the name of your hospital or clinic." }, { status: 400 });
  if (!contactName) return NextResponse.json({ error: "Please add your name." }, { status: 400 });
  if (phone.length < 10) return NextResponse.json({ error: "Please add a phone number we can call." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Please add a real email address." }, { status: 400 });

  const admin = createAdminClient();
  const firstName = contactName.split(/\s+/)[0] || contactName;

  // Make an admin invite for a hospital and email it. Returns whether it went.
  const sendLink = async (hospitalId: string, hospitalName: string): Promise<boolean> => {
    const token = readableToken(hospitalName, false);
    const { error } = await admin.from("hospital_invites").insert({
      token,
      hospital_id: hospitalId,
      role: "admin",
      name: contactName,
      phone,
      email,
      expires_at: new Date(Date.now() + INVITE_DAYS * 86400000).toISOString(),
    });
    if (error) return false;
    const mail = pilotEmail(firstName, hospitalName, `${SITE_URL}/hospital/join/${token}`, PILOT_DAYS, PILOT_SEATS, INVITE_DAYS);
    return (await sendEmail(email, mail.subject, mail.html, mail.text, "hospital-pilot")).ok;
  };

  if (!isQuote) {
    const { data: same } = await admin
      .from("hospitals")
      .select("id,name,status")
      .eq("contact_email", email)
      .ilike("name", name)
      .in("status", ["pilot", "active"])
      .limit(1);
    if (same && same.length > 0) {
      const emailed = await sendLink(same[0].id as string, same[0].name as string);
      return NextResponse.json({ ok: true, started: true, emailed, again: true });
    }
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const now = new Date();
    const pilot = isQuote
      ? { status: "requested" }
      : {
          status: "pilot",
          plan: "pilot",
          seats: PILOT_SEATS,
          access_until: new Date(now.getTime() + PILOT_DAYS * 86400000).toISOString(),
          approved_at: now.toISOString(),
        };
    const { data: row, error } = await admin.from("hospitals").insert({
      code: newCode(),
      name,
      contact_name: contactName,
      contact_role: contactRole || null,
      contact_phone: phone,
      contact_email: email,
      city: city || null,
      state: state || null,
      est_patients: Number.isFinite(est) && est > 0 ? Math.min(est, 100000) : null,
      message: message || null,
      ...pilot,
    }).select("id").single();
    if (!error && row) {
      const emailed = isQuote ? false : await sendLink(row.id as string, name);
      await notifyFounder(
        isQuote ? `Quote request: ${name}` : `New free pilot started: ${name}${emailed ? "" : " (setup email did not send)"}`,
        [
          ["Hospital", name],
          ["Where", [city, state].filter(Boolean).join(", ")],
          ["Patients with diabetes", Number.isFinite(est) && est > 0 ? String(est) : null],
          ["Contact", [contactName, contactRole].filter(Boolean).join(", ")],
          ["WhatsApp", phone],
          ["Email", email],
          ["Message", typed],
          ...(isQuote ? [] : ([["Setup link emailed", emailed ? "Yes" : "No, send it from admin"]] as [string, string][])),
        ],
        `${SITE_URL}/admin/hospitals`,
      );
      return NextResponse.json({ ok: true, started: !isQuote, emailed });
    }
    // A code clash is the only error worth another try.
    if (error && !/duplicate|unique/i.test(error.message)) {
      return NextResponse.json(
        { error: "We could not send this just now. Please try again, or chat with us on WhatsApp." },
        { status: 503 },
      );
    }
  }
  return NextResponse.json({ error: "Please try again." }, { status: 503 });
}
