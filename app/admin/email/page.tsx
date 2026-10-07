import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import { isUserType } from "@/lib/userType";
import { mailyteConfigured, listSenders, recentCampaigns, type Sender, type SentEmail } from "@/lib/mailyte";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminCard from "../AdminCard";
import AdminTile from "../AdminTile";
import Compose from "./Compose";
import AddContact from "./AddContact";

export const dynamic = "force-dynamic";

const ROWS = [
  { key: "diabetic", label: "Diabetic" },
  { key: "health_pro", label: "Health professional" },
  { key: "caregiver", label: "Caregiver" },
  { key: "unset", label: "Not set" },
] as const;

const STATE: Record<string, string> = {
  sent: "Sent",
  sending: "Sending",
  scheduled: "Scheduled",
  paused: "Paused",
  canceled: "Cancelled",
};

/** Write and send emails to users, through Mailyte. */
export default async function EmailPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  const admin = createAdminClient();
  const full = await admin.from("profiles").select("email,user_type,email_updates");
  const ready = !full.error;
  const data = ready ? full.data : (await admin.from("profiles").select("email,user_type")).data;
  const people = (data ?? []).filter((p) => p.email && !isInternalEmail(p.email as string));

  const count = { yes: 0, no: 0, notAsked: 0 };
  const table: Record<string, { yes: number; total: number }> = {};
  for (const r of ROWS) table[r.key] = { yes: 0, total: 0 };
  for (const p of people) {
    const v = (p as { email_updates?: boolean | null }).email_updates;
    if (v === true) count.yes += 1;
    else if (v === false) count.no += 1;
    else count.notAsked += 1;
    const k = p.user_type && isUserType(p.user_type) ? p.user_type : "unset";
    table[k].total += 1;
    if (v === true) table[k].yes += 1;
  }

  const keyOn = mailyteConfigured();
  let senders: Sender[] = [];
  let sent: SentEmail[] = [];
  let problem = "";
  if (keyOn) {
    try {
      [senders, sent] = await Promise.all([listSenders(), recentCampaigns(10)]);
    } catch (e) {
      problem = e instanceof Error ? e.message : "Could not reach Mailyte.";
    }
  }

  return (
    <AdminShell title="Email">
      {(!ready || !keyOn || problem) && (
        <div className="mb-4 rounded-2xl border border-verdict-yellow/60 bg-verdict-yellow/10 p-4 text-sm text-ink">
          {!ready ? "Database update needed (email-consent-schema.sql)." : !keyOn ? "Mailyte is not connected." : problem}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminTile label="Said yes" value={String(count.yes)} icon={CheckCircle2} tone="green" />
        <AdminTile label="Not asked yet" value={String(count.notAsked)} icon={CircleHelp} tone="amber" />
        <AdminTile label="Said no" value={String(count.no)} icon={XCircle} tone="red" />
      </div>

      <AdminCard className="mt-4" title="Write an email">
        {senders.length > 0 ? (
          <Compose senders={senders} lists={ROWS.map((r) => ({ key: r.key, label: r.label, yes: table[r.key].yes }))} />
        ) : (
          <p className="text-sm text-ink-soft">No verified sender found in Mailyte.</p>
        )}
      </AdminCard>

      <AdminCard className="mt-4" title="Sent emails" flush>
        {sent.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink-soft sm:px-6">None yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2 sm:px-6">Subject</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Sent</th>
                <th className="px-3 py-2 text-right">Opened</th>
                <th className="px-5 py-2 text-right sm:px-6">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {sent.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-semibold text-ink sm:px-6">{c.subject}</td>
                  <td className="px-3 py-3 text-ink-soft">
                    {new Date(c.when).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{STATE[c.state] ?? c.state}</td>
                  <td className="px-3 py-3 text-right">{c.sent ?? "—"}</td>
                  <td className="px-3 py-3 text-right">{c.opened ?? "—"}</td>
                  <td className="px-5 py-3 text-right sm:px-6">{c.clicked ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>

      <AdminCard className="mt-4" title="Lists" flush>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-2 sm:px-6">Who</th>
              <th className="px-3 py-2 text-right">Said yes</th>
              <th className="px-3 py-2 text-right">All users</th>
              <th className="px-5 py-2 text-right sm:px-6">Export</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-semibold text-ink sm:px-6">{r.label}</td>
                <td className="px-3 py-3 text-right font-bold text-ink">{table[r.key].yes}</td>
                <td className="px-3 py-3 text-right text-ink-soft">{table[r.key].total}</td>
                <td className="px-5 py-3 text-right sm:px-6">
                  <a
                    href={`/api/admin/mailyte/export?group=${r.key}&only=yes`}
                    aria-label={`Download ${r.label.toLowerCase()} who said yes`}
                    className="font-bold text-leaf-deep hover:underline"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-5 py-4 text-sm sm:px-6">
          <a href="/api/admin/mailyte/export?group=all&only=yes" className="font-bold text-leaf-deep hover:underline">
            Download all who said yes
          </a>
          <a href="/api/admin/mailyte/export?group=all" className="font-bold text-ink-soft hover:underline">
            Download all users
          </a>
        </div>
      </AdminCard>

      <AdminCard className="mt-4" title="Add a contact">
        <AddContact disabled={!keyOn} />
      </AdminCard>
    </AdminShell>
  );
}
