import { Users, Stethoscope, HeartHandshake, HeartPulse } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { AUDIENCES, emailAudience } from "@/lib/emailAudience";
import { NAME_TOKEN, mailyteConfigured, listSenders, recentCampaigns, type Sender, type SentEmail } from "@/lib/mailyte";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminCard from "../AdminCard";
import FoldCard from "@/components/FoldCard";
import AdminTile from "../AdminTile";
import Compose from "./Compose";
import AddContact from "./AddContact";
import SentEmails from "./SentEmails";
import DirectEmail, { type DirectFrom, type DirectSent } from "./DirectEmail";
import { DIRECT_SENDERS } from "@/lib/directEmail";
import { hiddenCampaigns } from "@/lib/hiddenCampaigns";

export const dynamic = "force-dynamic";

const ROWS = AUDIENCES;


/** Write and send emails to users, through Mailyte. */
export default async function EmailPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  // The same lists the send uses (lib/emailAudience.ts): direct users, and
  // dietitians, hospital staff and covered patients each on their own.
  const people = await emailAudience(createAdminClient()).catch(() => []);
  const table: Record<string, number> = {};
  for (const r of ROWS) table[r.key] = 0;
  for (const p of people) table[p.key] += 1;

  const keyOn = mailyteConfigured();
  let senders: Sender[] = [];
  let sent: SentEmail[] = [];
  let problem = "";
  if (keyOn) {
    try {
      const hidden = await hiddenCampaigns();
      [senders, sent] = await Promise.all([listSenders(), recentCampaigns(10, hidden)]);
    } catch (e) {
      problem = e instanceof Error ? e.message : "Could not reach Mailyte.";
    }
  }

  // One-to-one emails (hospitals, HMOs, anyone). Each From address must be a
  // verified Mailyte sender; null = could not check (no key / Mailyte down).
  const directFrom: DirectFrom[] = DIRECT_SENDERS.map((d) => {
    const m = senders.find((s) => s.email.toLowerCase() === d.email);
    return { email: d.email, name: d.name, ready: keyOn && !problem ? !!m?.verified : null };
  });
  let directSent: DirectSent[] = [];
  let directReady = false;
  try {
    const { data, error } = await createAdminClient()
      .from("direct_emails")
      .select("id, sent_at, from_email, to_name, to_email, cc, subject, html, attachments")
      .order("sent_at", { ascending: false })
      .limit(100);
    if (!error) {
      directReady = true;
      directSent = (data ?? []) as DirectSent[];
    }
  } catch {
    directReady = false;
  }

  return (
    <AdminShell title="Email">
      {(!keyOn || problem) && (
        <div className="mb-4 rounded-2xl border border-verdict-yellow/60 bg-verdict-yellow/10 p-4 text-sm text-ink">
          {!keyOn ? "Mailyte is not connected." : problem}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminTile label="All users" value={String(people.length)} icon={Users} tone="blue" />
        <AdminTile label="Diabetic" value={String(table.diabetic)} icon={HeartPulse} tone="green" />
        <AdminTile label="Health professional" value={String(table.health_pro)} icon={Stethoscope} tone="blue" />
        <AdminTile label="Caregiver" value={String(table.caregiver)} icon={HeartHandshake} tone="green" />
      </div>

      <div id="write-email" className="scroll-mt-24">
      <AdminCard className="mt-4" title="Write an email">
        {senders.length > 0 ? (
          <Compose
            senders={senders}
            nameToken={NAME_TOKEN}
            lists={ROWS.map((r) => ({ key: r.key, label: r.label, count: table[r.key] }))}
          />
        ) : (
          <p className="text-sm text-ink-soft">No sender found in Mailyte.</p>
        )}
      </AdminCard>
      </div>

      <AdminCard className="mt-4" title="Email one person or organisation" sub="A hospital, an HMO, or anyone. You can attach files.">
        <DirectEmail senders={directFrom} sent={directSent} listReady={directReady} />
      </AdminCard>

      <SentEmails sent={sent} />

      <AdminCard className="mt-4" title="Lists" flush>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-2 sm:px-6">Who</th>
              <th className="px-3 py-2 text-right">People</th>
              <th className="px-5 py-2 text-right sm:px-6">Export</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-semibold text-ink sm:px-6">{r.label}</td>
                <td className="px-3 py-3 text-right font-bold text-ink">{table[r.key]}</td>
                <td className="px-5 py-3 text-right sm:px-6">
                  <a
                    href={`/api/admin/mailyte/export?group=${r.key}`}
                    aria-label={`Download ${r.label.toLowerCase()}`}
                    className="font-bold text-leaf-deep hover:underline"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-line px-5 py-4 text-sm sm:px-6">
          <a href="/api/admin/mailyte/export?group=all" className="font-bold text-leaf-deep hover:underline">
            Download all users
          </a>
        </div>
      </AdminCard>

      {/* Used now and then: folded. */}
      <FoldCard className="mt-4" title="Add a contact" sub="Put anyone on a list by hand.">
        <AddContact disabled={!keyOn} />
      </FoldCard>
    </AdminShell>
  );
}
