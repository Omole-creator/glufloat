import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/recordings";

export const dynamic = "force-dynamic";

/** Details and transcripts for several calls at once, for one combined PDF. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (ids.length === 0) return NextResponse.json({ calls: [] });
  const admin = createAdminClient();
  const [{ data: sessions }, { data: lines }] = await Promise.all([
    admin.from("call_sessions").select("*").in("id", ids),
    admin.from("call_lines").select("*").in("session_id", ids).order("t_ms").order("id"),
  ]);
  const byId = new Map((sessions ?? []).map((s) => [s.id as string, s]));
  // In the order they were ticked, so the PDF reads the way it was asked for.
  const calls = ids
    .filter((id) => byId.has(id))
    .map((id) => ({
      session: byId.get(id),
      lines: (lines ?? []).filter((l) => l.session_id === id),
    }));
  return NextResponse.json({ calls });
}
