import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { THREAD_COLS, chatReady, inboxDietitians, type ThreadRow } from "@/lib/chatServer";
import InboxShell from "@/components/inbox/InboxShell";
import NotInbox from "@/components/inbox/NotInbox";
import StaffChat from "@/components/chat/StaffChat";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chat", robots: { index: false, follow: false } };

/** One Premium member's chat, for their GluFloat dietitian. */
export default async function InboxThreadPage({ params }: { params: Promise<{ thread: string }> }) {
  const { thread: id } = await params;
  const user = await sessionUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/inbox/${id}`)}`);
  const admin = createAdminClient();
  const mine = await inboxDietitians(admin, user.id);
  if (mine.length === 0) return <NotInbox />;
  if (!(await chatReady(admin))) redirect("/inbox");

  const { data } = await admin
    .from("chat_threads")
    .select(THREAD_COLS)
    .eq("id", id)
    .in(
      "dietitian_id",
      mine.map((d) => d.id),
    )
    .maybeSingle();
  if (!data) redirect("/inbox");
  const thread = data as ThreadRow;
  const { data: profile } = await admin.from("profiles").select("name").eq("id", thread.patient_id).maybeSingle();
  const name = ((profile?.name as string | null) || "").trim() || "A member";
  const first = name.split(/\s+/)[0];

  return (
    <InboxShell name={mine[0].name} title={name} subtitle="GluFloat Premium member">
      <Link href="/inbox" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> All chats
      </Link>
      <div className="mt-5">
        <StaffChat
          firstName={first}
          apiUrl="/api/inbox/chat"
          ids={{ thread: thread.id }}
          canSend
          note={`${first} chats with you from their GluFloat app.`}
        />
      </div>
    </InboxShell>
  );
}
