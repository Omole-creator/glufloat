import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import { mailerliteConfigured, syncContacts, type Contact } from "@/lib/mailerlite";

export const dynamic = "force-dynamic";

/** Send everyone who said yes to MailerLite, in their group. Admin only. */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!mailerliteConfigured()) {
    return NextResponse.json({ error: "Add MAILERLITE_API_KEY in Vercel first." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("email,name,user_type,email_updates");
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
    }));
  try {
    return NextResponse.json(await syncContacts(contacts));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 502 });
  }
}
