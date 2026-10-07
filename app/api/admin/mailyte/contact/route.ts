import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { addContact, mailyteConfigured, GROUP_NAME } from "@/lib/mailyte";

export const dynamic = "force-dynamic";

/**
 * Add one person by hand, straight onto a Mailyte list: somebody met at a
 * clinic or an event who agreed to get emails. Only with their yes, which the
 * form makes you tick. They are not added to GluFloat's own user list.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!mailyteConfigured()) {
    return NextResponse.json({ error: "Add MAILYTE_API_KEY in Vercel first." }, { status: 400 });
  }
  const b = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    group?: string;
    agreed?: boolean;
  };
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Type a real email address." }, { status: 400 });
  }
  if (!b.group || !(b.group in GROUP_NAME)) {
    return NextResponse.json({ error: "Pick who they are." }, { status: 400 });
  }
  if (b.agreed !== true) {
    return NextResponse.json({ error: "Tick the box to say they agreed to get emails." }, { status: 400 });
  }
  try {
    await addContact(email, String(b.name ?? "").trim(), b.group as keyof typeof GROUP_NAME);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 502 });
  }
}
