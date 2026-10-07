import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import { isUserType } from "@/lib/userType";
import { GROUP_NAME, mailerliteConfigured } from "@/lib/mailerlite";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminCard from "../AdminCard";
import AdminTile from "../AdminTile";
import SyncButton from "./SyncButton";
import AddContact from "./AddContact";

export const dynamic = "force-dynamic";

const ROWS: { key: keyof typeof GROUP_NAME; label: string }[] = [
  { key: "diabetic", label: "Diabetic" },
  { key: "health_pro", label: "Health professional" },
  { key: "caregiver", label: "Caregiver" },
  { key: "unset", label: "Not set" },
];

/**
 * Emails to users, through MailerLite. This screen sends the list (who said
 * yes, grouped by who they are); the email itself is written in MailerLite.
 */
export default async function EmailPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  const admin = createAdminClient();
  const full = await admin.from("profiles").select("email,user_type,email_updates");
  const ready = !full.error;
  // Before the SQL runs, still count the users (everyone reads as not asked).
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
  const keyOn = mailerliteConfigured();

  return (
    <AdminShell title="Email" subtitle="Send your users' list to MailerLite, sorted by who they are.">
      {!ready && (
        <div className="mb-4 rounded-2xl border border-verdict-yellow/60 bg-verdict-yellow/10 p-4 text-sm text-ink">
          Waiting for the database update. Run <code>supabase/email-consent-schema.sql</code> in Supabase.
        </div>
      )}
      {!keyOn && (
        <div className="mb-4 rounded-2xl border border-verdict-yellow/60 bg-verdict-yellow/10 p-4 text-sm text-ink">
          MailerLite is not connected. Add <code>MAILERLITE_API_KEY</code> in Vercel, then deploy again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminTile label="Said yes to emails" value={String(count.yes)} sub="Only these get emails" icon={CheckCircle2} tone="green" />
        <AdminTile label="Not asked yet" value={String(count.notAsked)} sub="They answer in My details" icon={CircleHelp} tone="amber" />
        <AdminTile label="Said no" value={String(count.no)} sub="Marked unsubscribed" icon={XCircle} tone="red" />
      </div>

      <AdminCard className="mt-4" title="Groups in MailerLite" sub="Each person goes into one group." flush>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-2 sm:px-6">Who</th>
              <th className="px-3 py-2">Group name</th>
              <th className="px-3 py-2 text-right">Said yes</th>
              <th className="px-3 py-2 text-right">All users</th>
              <th className="px-5 py-2 text-right sm:px-6">List</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-semibold text-ink sm:px-6">{r.label}</td>
                <td className="px-3 py-3 text-ink-soft">{GROUP_NAME[r.key]}</td>
                <td className="px-3 py-3 text-right font-bold text-ink">{table[r.key].yes}</td>
                <td className="px-3 py-3 text-right text-ink-soft">{table[r.key].total}</td>
                <td className="px-5 py-3 text-right sm:px-6">
                  <a
                    href={`/api/admin/mailerlite/export?group=${r.key}&only=yes`}
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
          <a href="/api/admin/mailerlite/export?group=all&only=yes" className="font-bold text-leaf-deep hover:underline">
            Download everyone who said yes
          </a>
          <a href="/api/admin/mailerlite/export?group=all" className="font-bold text-ink-soft hover:underline">
            Download all users, with their answer
          </a>
        </div>
      </AdminCard>

      <AdminCard className="mt-4" title="Send an email">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
          <li>Press the button to send the latest list to MailerLite.</li>
          <li>
            In MailerLite, make a new campaign and write your email. Send it from one of our addresses:
            <span className="font-semibold"> care@glufloat.com</span> for diabetics and caregivers,
            <span className="font-semibold"> omole@glufloat.com</span> for health professionals, and
            <span className="font-semibold"> support@glufloat.com</span> as the reply address.
          </li>
          <li>Pick the group to send it to: diabetics, health professionals, or caregivers.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SyncButton disabled={!ready || !keyOn} />
          <a
            href="https://dashboard.mailerlite.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold text-leaf-deep hover:underline"
          >
            Open MailerLite &rarr;
          </a>
        </div>
      </AdminCard>

      <AdminCard
        className="mt-4"
        title="Add a contact"
        sub="Someone who is not a GluFloat user yet, but asked for our emails. Goes straight into MailerLite."
      >
        <AddContact disabled={!keyOn} />
      </AdminCard>
    </AdminShell>
  );
}
