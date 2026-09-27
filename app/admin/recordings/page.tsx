import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/recordings";
import type { CallSession } from "@/lib/recordingTypes";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import RecordingsPanel from "./RecordingsPanel";

export const dynamic = "force-dynamic";

/**
 * Customer calls: make a link, send it, talk, and the call is recorded and
 * written down as it goes. Every call is kept here with its transcript.
 */
export default async function RecordingsPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  const admin = createAdminClient();
  const [{ data: sessions, error }, { data: lineRows }] = await Promise.all([
    admin.from("call_sessions").select("*").order("created_at", { ascending: false }),
    admin.from("call_lines").select("session_id"),
  ]);

  const lineCounts: Record<string, number> = {};
  for (const r of lineRows ?? []) {
    const id = r.session_id as string;
    lineCounts[id] = (lineCounts[id] ?? 0) + 1;
  }

  return (
    <AdminShell title="Recordings" subtitle="Customer calls, recorded and written down as you talk.">
      <RecordingsPanel
        sessions={(sessions ?? []) as CallSession[]}
        lineCounts={lineCounts}
        needsSetup={!!error}
      />
    </AdminShell>
  );
}
