import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin, newToken } from "@/lib/recordings";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Make a new call link: a customer name, a purpose, and a secret token. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const customer_name = clean(body.customer_name, 120);
  const purpose = clean(body.purpose, 300);
  if (!customer_name || !purpose) {
    return NextResponse.json({ error: "Add the customer's name and the purpose." }, { status: 400 });
  }
  const { data, error } = await createAdminClient()
    .from("call_sessions")
    .insert({ customer_name, purpose, token: newToken() })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
