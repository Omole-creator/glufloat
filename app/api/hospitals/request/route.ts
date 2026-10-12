import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { newCode } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * A hospital asks for the free 30-day pilot, from /hospitals. It lands in
 * /admin/hospitals as "requested", and nothing else happens until GluFloat
 * approves it by hand (founder's call). Public, so it only ever INSERTS a
 * request and never reveals anything back.
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
  const message = clip(body.message, 1000);

  if (!name) return NextResponse.json({ error: "Please add the name of your hospital or clinic." }, { status: 400 });
  if (!contactName) return NextResponse.json({ error: "Please add your name." }, { status: 400 });
  if (phone.length < 10) return NextResponse.json({ error: "Please add a phone number we can call." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Please add a real email address." }, { status: 400 });

  const admin = createAdminClient();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await admin.from("hospitals").insert({
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
      status: "requested",
    });
    if (!error) return NextResponse.json({ ok: true });
    // A code clash is the only error worth another try.
    if (!/duplicate|unique/i.test(error.message)) {
      return NextResponse.json(
        { error: "We could not send this just now. Please try again, or chat with us on WhatsApp." },
        { status: 503 },
      );
    }
  }
  return NextResponse.json({ error: "Please try again." }, { status: 503 });
}
