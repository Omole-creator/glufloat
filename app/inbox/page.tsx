import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageCircle, UserRound } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { clockLabel, dayLabel, waitLabel, waitingSince, watDay } from "@/lib/chat";
import { THREAD_COLS, chatReady, inboxDietitians, type ThreadRow } from "@/lib/chatServer";
import InboxShell from "@/components/inbox/InboxShell";
import NotInbox from "@/components/inbox/NotInbox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dietitian inbox", robots: { index: false, follow: false } };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A GluFloat Premium dietitian's inbox (2026-10-15): every chat with the
 * Premium members assigned to her, waiting ones first, and below them the
 * members who have not written yet, so she can start a chat herself.
 */
export default async function InboxPage() {
  const user = await sessionUser();
  if (!user) redirect("/signin?next=/inbox");
  const admin = createAdminClient();
  const mine = await inboxDietitians(admin, user.id);
  if (mine.length === 0) return <NotInbox />;
  const ready = await chatReady(admin);
  const ids = mine.map((d) => d.id);

  const [{ data: threads }, { data: assigned }] = await Promise.all([
    ready
      ? admin.from("chat_threads").select(THREAD_COLS).in("dietitian_id", ids).order("last_message_at", { ascending: false, nullsFirst: false }).limit(300)
      : Promise.resolve({ data: [] as ThreadRow[] }),
    admin.from("dietitian_assignments").select("user_id").in("dietitian_id", ids),
  ]);
  const memberIds = ((assigned ?? []) as { user_id: string }[]).map((a) => a.user_id);
  // Only members whose Premium is live: a lapsed member's chat closes on their side too.
  const [{ data: subs }, { data: profiles }] = await Promise.all([
    memberIds.length
      ? admin.from("subscriptions").select("user_id,tier,status,current_period_end").in("user_id", memberIds)
      : Promise.resolve({ data: [] }),
    memberIds.length ? admin.from("profiles").select("id,name,email").in("id", memberIds) : Promise.resolve({ data: [] }),
  ]);
  const live = new Set(
    ((subs ?? []) as { user_id: string; tier: string; status: string; current_period_end: string | null }[])
      .filter((s) => s.tier === "dietitian" && (s.status === "active" || s.status === "non-renewing") && s.current_period_end && new Date(s.current_period_end).getTime() > Date.now())
      .map((s) => s.user_id),
  );
  const nameOf = new Map(((profiles ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [p.id, (p.name || "").trim() || "A member"]));

  const chats = ((threads ?? []) as ThreadRow[]).filter((t) => t.last_message_at && live.has(t.patient_id));
  const last = await Promise.all(
    chats.map((t) =>
      admin.from("chat_messages").select("body,sender_role").eq("thread_id", t.id).order("id", { ascending: false }).limit(1).maybeSingle(),
    ),
  );
  const rows = chats
    .map((t, i) => {
      const m = last[i].data as { body: string; sender_role: string } | null;
      return {
        id: t.id,
        name: nameOf.get(t.patient_id) ?? "A member",
        at: t.last_message_at as string,
        preview: m ? `${m.sender_role === "patient" ? "" : "You: "}${m.body}` : "",
        waiting: waitingSince({ lastPatientAt: t.last_patient_at, lastStaffAt: t.last_staff_at, patientReadAt: t.patient_read_at, staffClearedAt: t.staff_cleared_at }),
      };
    })
    .sort((a, b) => (!!a.waiting !== !!b.waiting ? (a.waiting ? -1 : 1) : a.waiting && b.waiting ? a.waiting.localeCompare(b.waiting) : b.at.localeCompare(a.at)));
  const withChat = new Set(chats.map((t) => t.patient_id));
  const quiet = memberIds.filter((u) => live.has(u) && !withChat.has(u)).map((u) => ({ id: u, name: nameOf.get(u) ?? "A member" }));
  const waitingCount = rows.filter((r) => r.waiting).length;
  const when = (iso: string) => (watDay(iso) === watDay(new Date().toISOString()) ? clockLabel(iso) : dayLabel(watDay(iso)));

  return (
    <InboxShell
      name={mine[0].name}
      title="Your members' chats"
      subtitle={
        waitingCount > 0
          ? `${waitingCount} ${waitingCount === 1 ? "member is" : "members are"} waiting for your reply`
          : "GluFloat Premium members write to you here."
      }
    >
      {!ready ? (
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white px-6 py-12 text-center text-sm text-ink-soft">
          Chats are not ready yet. Please check again later.
        </p>
      ) : (
        <>
          <section className="mt-6 overflow-hidden rounded-2xl border border-[#e3e9f1] bg-white">
            {rows.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <MessageCircle className="h-6 w-6" />
                </span>
                <p className="mt-3 font-display text-lg font-bold text-ink">No messages yet</p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">When a member writes to you from their GluFloat app, the chat shows up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#eef2f7]">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/inbox/${r.id}`} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-[#f9fbfd] sm:px-5 ${r.waiting ? "bg-brand/[0.035]" : ""}`}>
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 font-display text-sm font-bold text-brand">
                        {initials(r.name)}
                        {r.waiting && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-verdict-red ring-2 ring-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={`truncate text-sm ${r.waiting ? "font-bold" : "font-semibold"} text-ink`}>{r.name}</span>
                          <span className="shrink-0 text-xs text-ink-soft">{when(r.at)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={`min-w-0 flex-1 truncate text-sm ${r.waiting ? "text-ink" : "text-ink-soft"}`}>{r.preview}</span>
                          {r.waiting && (
                            <span className="shrink-0 rounded-full bg-verdict-red px-2 py-0.5 text-[11px] font-bold text-white">Waiting {waitLabel(r.waiting)}</span>
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

          {quiet.length > 0 && (
            <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-5">
              <h2 className="font-display text-base font-bold text-ink">Members who have not written yet</h2>
              <p className="mt-1 text-sm text-ink-soft">You can start the chat. They get a phone alert if they turned alerts on.</p>
              <ul className="mt-3 divide-y divide-[#eef2f7]">
                {quiet.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink-soft">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{m.name}</span>
                    <Link
                      href={`/inbox/start?u=${m.id}`}
                      prefetch={false}
                      className="shrink-0 rounded-full bg-brand/10 px-3.5 py-1.5 text-xs font-bold text-brand hover:bg-brand/15"
                    >
                      Start a chat
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </InboxShell>
  );
}
