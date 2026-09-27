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
  // The link ends in one number and one letter, so two customers with the
  // same name can land on the same one. Try another ending if so.
  let data = null;
  let error = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    ({ data, error } = await createAdminClient()
      .from("call_sessions")
      .insert({ customer_name, purpose, token: newToken(customer_name) })
      .select("*")
      .single());
    if (!error || error.code !== "23505") break;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
