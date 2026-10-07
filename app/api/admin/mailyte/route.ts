import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import { mailyteConfigured, syncContacts, type Contact } from "@/lib/mailyte";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Send everyone who said yes to Mailyte, on their list. Admin only. */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!mailyteConfigured()) {
    return NextResponse.json({ error: "Add MAILYTE_API_KEY in Vercel first." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("email,name,user_type,email_updates,email_updates_at");
  if (error) {
    return NextResponse.json(
      { error: "The database is missing the email question. Run supabase/email-consent-schema.sql." },
      { status: 400 },
    );
  }
  const contacts: Contact[] = (data ?? [])
    .filter((p) => p.email && !isInternalEmail(p.email as string))
    .map((p) => ({
      email: String(p.email).trim().toLowerCase(),
      name: (p.name as string | null) ?? null,
      userType: (p.user_type as string | null) ?? null,
      emailUpdates: typeof p.email_updates === "boolean" ? p.email_updates : null,
      consentedAt: (p.email_updates_at as string | null) ?? null,
    }));
  try {
    return NextResponse.json(await syncContacts(contacts));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 502 });
  }
}
