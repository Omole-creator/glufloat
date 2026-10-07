import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { addContact, mailyteConfigured, GROUP_NAME } from "@/lib/mailyte";

export const dynamic = "force-dynamic";

/** Add one person by hand onto a Mailyte list. They are not added to GluFloat's user list. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!mailyteConfigured()) {
    return NextResponse.json({ error: "Add MAILYTE_API_KEY in Vercel first." }, { status: 400 });
  }
  const b = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    group?: string;
  };
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Type a real email address." }, { status: 400 });
  }
  if (!b.group || !(b.group in GROUP_NAME)) {
    return NextResponse.json({ error: "Pick who they are." }, { status: 400 });
  }
  try {
    await addContact(email, String(b.name ?? "").trim(), b.group as keyof typeof GROUP_NAME);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 502 });
  }
}
