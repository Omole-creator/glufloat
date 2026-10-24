import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { deleteOwnAccount, previewDelete } from "@/lib/accountDelete";

export const dynamic = "force-dynamic";

/** GET: what deleting would mean for the signed-in person (lib/accountDelete.ts). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const preview = await previewDelete(createAdminClient(), user.id, user.email ?? null);
  return NextResponse.json(preview);
}

/** POST { confirm: "DELETE" }: delete the signed-in person's own account, for good. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (String(body.confirm ?? "").trim().toUpperCase() !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }
  const res = await deleteOwnAccount(createAdminClient(), user.id, user.email ?? null);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
