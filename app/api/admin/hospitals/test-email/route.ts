import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { FOUNDER_INBOX, notifyFounder } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Send one test alert to the founder's inbox, and say exactly what Mailyte answered. */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const r = await notifyFounder(
    "Test: GluFloat hospital alerts work",
    [["What this is", "A test from Admin → Hospitals. When a hospital asks for a pilot or a quote, you get an email like this."]],
    `${SITE_URL}/admin/hospitals`,
  );
  return NextResponse.json({ ...r, to: FOUNDER_INBOX });
}
