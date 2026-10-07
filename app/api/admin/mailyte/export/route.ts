import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import { isUserType, typeLabel } from "@/lib/userType";

export const dynamic = "force-dynamic";

/** Same safe cell and Excel byte-order mark as /api/admin/users/export. */
const cell = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const BOM = String.fromCharCode(0xfeff);
const GROUPS = ["diabetic", "health_pro", "caregiver", "unset", "all"] as const;

/**
 * The email list as a CSV that Excel opens and Mailyte imports.
 * ?group=diabetic|health_pro|caregiver|unset|all, and ?only=yes for just the
 * people who said yes to emails (the only ones you may email).
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const asked = params.get("group") ?? "all";
  const group = (GROUPS as readonly string[]).includes(asked) ? asked : "all";
  const onlyYes = params.get("only") === "yes";

  const admin = createAdminClient();
  let rows: Record<string, unknown>[] = [];
  const full = await admin.from("profiles").select("name,email,user_type,email_updates");
  if (full.error) {
    // Before the SQL runs there is no answer to show; never export as "yes".
    if (onlyYes) return NextResponse.json({ error: "Run email-consent-schema.sql first." }, { status: 400 });
    rows = ((await admin.from("profiles").select("name,email,user_type")).data ?? []) as Record<string, unknown>[];
  } else {
    rows = (full.data ?? []) as Record<string, unknown>[];
  }

  const lines = [["Name", "Email", "Who", "Said yes to emails"].map(cell).join(",")];
  for (const p of rows) {
    const email = p.email as string | null;
    if (!email || isInternalEmail(email)) continue;
    const t = p.user_type as string | null;
    const key = t && isUserType(t) ? t : "unset";
    if (group !== "all" && key !== group) continue;
    const v = p.email_updates as boolean | null | undefined;
    if (onlyYes && v !== true) continue;
    const answer = v === true ? "Yes" : v === false ? "No" : "Not asked";
    lines.push([p.name as string, email, typeLabel(t), answer].map(cell).join(","));
  }

  const name = `glufloat-email-${group}${onlyYes ? "-said-yes" : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(BOM + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
