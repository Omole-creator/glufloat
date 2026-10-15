import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { hospitalLive, isPractice } from "@/lib/hospitalPlans";
import { clockLabel, dayLabel, waitLabel, waitingSince, watDay } from "@/lib/chat";
import { THREAD_COLS, chatReady, type ThreadRow } from "@/lib/chatServer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

/**
 * Every patient chat at this hospital, newest first, with the ones waiting for
 * an answer on top. Opening one goes to the patient's page, where the chat
 * sits beside their record.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital/messages");
  if (!ctx) return <NotStaff />;
  const hid = ctx.all.length > 1 ? ctx.hospital.id : null;
  const ready = await chatReady(ctx.admin);

  let rows: { rowId: string; name: string; last: string; preview: string; from: string; waiting: string | null }[] = [];
  if (ready && hospitalLive(ctx.hospital)) {
    const [{ data: threads }, { data: pats }] = await Promise.all([
      ctx.admin
        .from("chat_threads")
        .select(THREAD_COLS)
        .eq("hospital_id", ctx.hospital.id)
        .not("last_message_at", "is", null)
        .order("last_message_at", { ascending: false })
        .limit(200),
      ctx.admin.from("hospital_patients").select("id,user_id,name,status").eq("hospital_id", ctx.hospital.id).eq("status", "active"),
    ]);
    const byUser = new Map(((pats ?? []) as { id: string; user_id: string | null; name: string }[]).filter((p) => p.user_id).map((p) => [p.user_id as string, p]));
    const list = ((threads ?? []) as ThreadRow[]).filter((t) => byUser.has(t.patient_id));
    // The newest message of each chat, for the preview line.
    const lastMsgs = await Promise.all(
      list.map((t) =>
        ctx.admin
          .from("chat_messages")
          .select("body,sender_role,sender_name,sender_id")
          .eq("thread_id", t.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    );
    rows = list.map((t, i) => {
      const p = byUser.get(t.patient_id)!;
      const m = lastMsgs[i].data as { body: string; sender_role: string; sender_name: string; sender_id: string | null } | null;
      return {
        rowId: p.id,
        name: p.name,
        last: t.last_message_at as string,
        preview: m?.body ?? "",
        from: !m ? "" : m.sender_role === "patient" ? "" : m.sender_id === ctx.user.id ? "You: " : `${m.sender_name}: `,
        waiting: waitingSince({
          lastPatientAt: t.last_patient_at,
          lastStaffAt: t.last_staff_at,
          patientReadAt: t.patient_read_at,
          staffClearedAt: t.staff_cleared_at,
        }),
      };
    });
    // Waiting first (longest wait first), then the rest by newest message.
    rows.sort((a, b) =>
      !!a.waiting !== !!b.waiting ? (a.waiting ? -1 : 1) : a.waiting && b.waiting ? a.waiting.localeCompare(b.waiting) : b.last.localeCompare(a.last),
    );
  }
  const waitingCount = rows.filter((r) => r.waiting).length;
  const when = (iso: string) => (watDay(iso) === watDay(new Date().toISOString()) ? clockLabel(iso) : dayLabel(watDay(iso)));

  return (
    <HospitalShell
      ctx={ctx}
      title="Messages"
      subtitle={
        waitingCount > 0
          ? `${waitingCount} ${waitingCount === 1 ? "patient is" : "patients are"} waiting for a reply`
          : isPractice(ctx.hospital)
            ? "Your patients' chats with you"
            : "Your patients' chats with your doctors and dietitians"
      }
    >
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#e3e9f1] bg-white">
        {!ready ? (
          <p className="px-6 py-12 text-center text-sm text-ink-soft">Messages are not ready yet. Please check again later.</p>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <MessageCircle className="h-6 w-6" />
            </span>
            <p className="mt-3 font-display text-lg font-bold text-ink">No messages yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
              When a patient writes from their GluFloat app, the chat shows up here and on their page.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#eef2f7]">
            {rows.map((r) => (
              <li key={r.rowId}>
                <Link
                  href={`/hospital/patients/${r.rowId}${hid ? `?h=${hid}` : ""}#chat`}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-[#f9fbfd] sm:px-5 ${r.waiting ? "bg-brand/[0.035]" : ""}`}
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 font-display text-sm font-bold text-brand">
                    {r.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                    {r.waiting && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-verdict-red ring-2 ring-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`truncate text-sm ${r.waiting ? "font-bold text-ink" : "font-semibold text-ink"}`}>{r.name}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{when(r.last)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-sm ${r.waiting ? "text-ink" : "text-ink-soft"}`}>
                        {r.from}
                        {r.preview}
                      </span>
                      {r.waiting && (
                        <span className="shrink-0 rounded-full bg-verdict-red px-2 py-0.5 text-[11px] font-bold text-white">
                          Waiting {waitLabel(r.waiting)}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft/60" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </HospitalShell>
  );
}
