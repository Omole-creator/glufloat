import { Megaphone } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import FoldCard from "@/components/FoldCard";
import { gmailThreadUrl, OUTREACH_DAYS, OUTREACH_STEPS, STATUS_LABEL, type Creator, type OutreachStatus } from "@/lib/creatorOutreach";
import CreatorControls from "./CreatorControls";

export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

const TONE: Record<OutreachStatus, string> = {
  emailing: "bg-brand/10 text-brand",
  replied: "bg-verdict-yellow/20 text-ink",
  yes: "bg-leaf/15 text-leaf-deep",
  no: "bg-mist text-ink-soft",
  stopped: "bg-mist text-ink-soft",
  bounced: "bg-verdict-red/10 text-verdict-red",
};

/**
 * Every creator emailed about the partnership (founder, 2026-10-26). The
 * emails go out from glufloat@gmail.com on a schedule; each creator is one
 * folded row, with Edit and Delete.
 */
export default async function CreatorsAdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const { data, error } = await createAdminClient().from("creator_outreach").select("*").order("first_sent_at", { ascending: false });

  if (error)
    return (
      <AdminShell title="Creators" icon={<Megaphone className="h-5 w-5" />}>
        <div className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Waiting for the database update. Paste <code className="font-mono text-ink">supabase/creator-outreach-schema.sql</code> into the
          Supabase SQL editor (#36 in SETUP.md).
        </div>
      </AdminShell>
    );

  const creators = (data ?? []) as Creator[];
  const count = (s: OutreachStatus) => creators.filter((c) => c.status === s).length;

  return (
    <AdminShell title="Creators" subtitle="Health creators emailed about the partnership" icon={<Megaphone className="h-5 w-5" />}>
      <div className="mt-6">
        <AdminHero
          items={[
            { label: "Emailed", value: String(creators.length) },
            { label: "Replied", value: String(count("replied")), sub: "waiting for you" },
            { label: "Said yes", value: String(count("yes")) },
            { label: "Said no or stopped", value: String(count("no") + count("stopped")) },
          ]}
        />
      </div>

      <div className="mt-6 space-y-3">
        {creators.length === 0 && (
          <p className="rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">Nobody emailed yet.</p>
        )}
        {creators.map((c) => (
          <FoldCard
            key={c.id}
            title={c.name}
            sub={[c.email, c.platform].filter(Boolean).join(" · ")}
            meta={
              <span className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                <span>
                  Email {c.step} of {OUTREACH_STEPS}
                  {c.status === "emailing" && c.next_due_at ? ` · next ${day(c.next_due_at)}` : ""}
                </span>
              </span>
            }
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {c.handle && (
                <div>
                  <dt className="text-xs font-semibold text-ink-soft">Handle</dt>
                  <dd className="text-ink">{c.handle}</dd>
                </div>
              )}
              {c.first_sent_at && (
                <div>
                  <dt className="text-xs font-semibold text-ink-soft">First emailed</dt>
                  <dd className="text-ink">{day(c.first_sent_at)}</dd>
                </div>
              )}
              {c.research && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-ink-soft">What we found about them</dt>
                  <dd className="text-ink">{c.research}</dd>
                </div>
              )}
              {c.reply_summary && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-ink-soft">What they replied</dt>
                  <dd className="text-ink">{c.reply_summary}</dd>
                </div>
              )}
              {c.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-ink-soft">Notes</dt>
                  <dd className="text-ink">{c.notes}</dd>
                </div>
              )}
            </dl>

            <p className="mt-4 text-xs font-semibold text-ink-soft">Emails sent</p>
            <ol className="mt-1 divide-y divide-[#e3e9f1] rounded-xl border border-[#e3e9f1]">
              {c.emails.map((e) => (
                <li key={e.step} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 text-ink">
                    <span className="font-semibold">Email {e.step}</span> (day {OUTREACH_DAYS[e.step - 1]}): {e.subject}
                  </span>
                  <span className="text-xs text-ink-soft">{day(e.sent_at)}</span>
                </li>
              ))}
            </ol>

            {c.thread_id && (
              <a href={gmailThreadUrl(c.thread_id)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-brand underline">
                Open the emails in Gmail
              </a>
            )}

            <CreatorControls c={c} />
          </FoldCard>
        ))}
      </div>
    </AdminShell>
  );
}
