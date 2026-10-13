import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { typeLabel } from "@/lib/userType";
import { firstName } from "@/lib/mailyte";
import { AUDIENCES, emailAudience, isAudienceKey } from "@/lib/emailAudience";

export const dynamic = "force-dynamic";

/** Same safe cell and Excel byte-order mark as /api/admin/users/export. */
const cell = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const BOM = String.fromCharCode(0xfeff);

/** The email list as a CSV that Excel opens. ?group=<an AUDIENCES key>|all (lib/emailAudience.ts) */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const asked = new URL(request.url).searchParams.get("group") ?? "all";
  const group = isAudienceKey(asked) ? asked : "all";

  let rows;
  try {
    rows = await emailAudience(createAdminClient());
  } catch {
    return NextResponse.json({ error: "Could not read the users." }, { status: 500 });
  }

  const lines = [["Name", "First name", "Email", "Who", "List"].map(cell).join(",")];
  for (const r of rows) {
    if (group !== "all" && r.key !== group) continue;
    const list = AUDIENCES.find((a) => a.key === r.key)?.label ?? "";
    lines.push([r.name, firstName(r.name), r.email, typeLabel(r.userType), list].map(cell).join(","));
  }

  const name = `glufloat-email-${group}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(BOM + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
