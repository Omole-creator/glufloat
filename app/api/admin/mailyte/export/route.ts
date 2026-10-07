import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import { isUserType, typeLabel } from "@/lib/userType";
import { firstName } from "@/lib/mailyte";

export const dynamic = "force-dynamic";

/** Same safe cell and Excel byte-order mark as /api/admin/users/export. */
const cell = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const BOM = String.fromCharCode(0xfeff);
const GROUPS = ["diabetic", "health_pro", "caregiver", "unset", "all"] as const;

/** The email list as a CSV that Excel opens. ?group=diabetic|health_pro|caregiver|unset|all */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const asked = new URL(request.url).searchParams.get("group") ?? "all";
  const group = (GROUPS as readonly string[]).includes(asked) ? asked : "all";

  const { data, error } = await createAdminClient().from("profiles").select("name,email,user_type");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lines = [["Name", "First name", "Email", "Who"].map(cell).join(",")];
  for (const p of data ?? []) {
    const email = p.email as string | null;
    if (!email || isInternalEmail(email)) continue;
    const t = p.user_type as string | null;
    const key = t && isUserType(t) ? t : "unset";
    if (group !== "all" && key !== group) continue;
    lines.push([p.name as string, firstName(p.name as string), email, typeLabel(t)].map(cell).join(","));
  }

  const name = `glufloat-email-${group}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(BOM + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
