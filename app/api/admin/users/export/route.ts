import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { inGroup, isGroup, typeLabel, type Group } from "@/lib/userType";

export const dynamic = "force-dynamic";

/**
 * One group of users, as a file Excel opens.
 *
 * CSV, not a real .xlsx. Excel and Google Sheets both open it with a
 * double-click, the email column pastes straight into a mail tool, and it needs
 * no library at all.
 *
 * This one DOES carry names and emails, unlike the partner report, and that is
 * the whole point: it is your own list, going nowhere but your own machine. The
 * partner PDF is a file handed to an outsider, which is why that one carries
 * counts only.
 */

/**
 * A cell that cannot break the file. A Nigerian name with a comma in it would
 * otherwise shift every column to its right by one, and the spreadsheet would
 * look fine while being wrong.
 */
function csvCell(v: string | null | undefined): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/**
 * The byte-order mark, for Excel. Without it Excel reads the file as
 * Windows-1252, and a name written properly (Adebayo and Ngozi with their marks)
 * opens as rubbish characters.
 */
const BOM = String.fromCharCode(0xfeff);

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";

export async function GET(request: Request) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const asked = new URL(request.url).searchParams.get("group") ?? "all";
  const group: Group = isGroup(asked) ? asked : "all";

  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("name,email,phone,user_type,created_at,trial_start")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter((p) => inGroup(p.user_type, group));

  const csv = [
    ["Name", "Email", "Phone", "What they are", "Joined", "Trial started"].join(","),
    ...rows.map((p) =>
      [
        csvCell(p.name),
        csvCell(p.email),
        csvCell(p.phone),
        csvCell(typeLabel(p.user_type)),
        csvCell(day(p.created_at)),
        csvCell(day(p.trial_start)),
      ].join(","),
    ),
  ].join("\r\n");

  const name = `glufloat-${group}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
