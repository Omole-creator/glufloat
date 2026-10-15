import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { cleanBody, isWaiting } from "@/lib/chat";
import { THREAD_COLS, chatReady, inboxDietitians, pushTo, saveMessage, threadMessages, times, type ThreadRow } from "@/lib/chatServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * A Premium dietitian's side of one chat (/inbox). She may open only chats of
 * the dietitian rows her own login is linked to (inhouse_dietitians.user_id).
 */
async function access(threadId: string) {
  const user = await sessionUser();
  if (!user) return { error: NextResponse.json({ error: "Please log in again." }, { status: 401 }) } as const;
  const admin = createAdminClient();
  if (!(await chatReady(admin))) return { error: NextResponse.json({ ready: false }, { headers: NO_STORE }) } as const;
  const mine = await inboxDietitians(admin, user.id);
  if (mine.length === 0) return { error: NextResponse.json({ error: "This inbox is for GluFloat dietitians." }, { status: 403 }) } as const;
  const { data } = await admin
    .from("chat_threads")
    .select(THREAD_COLS)
    .eq("id", threadId)
    .in(
      "dietitian_id",
      mine.map((d) => d.id),
    )
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "We could not find this chat." }, { status: 404 }) } as const;
  const thread = data as ThreadRow;
  const me = mine.find((d) => d.id === thread.dietitian_id)!;
  return { user, admin, thread, me } as const;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const a = await access(String(url.searchParams.get("thread") ?? ""));
  if ("error" in a) return a.error;
  const after = Number(url.searchParams.get("after") ?? 0) || 0;
  return NextResponse.json(
    {
      ready: true,
      canSend: true,
      waiting: isWaiting(times(a.thread)),
      messages: await threadMessages(a.admin, a.thread.id, a.user.id, false, after),
    },
    { headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const a = await access(String(body.thread ?? ""));
  if ("error" in a) return a.error;

  if (body.action === "clear") {
    // Handled up to the patient's last message, in the database's own time.
    if (a.thread.last_patient_at) await a.admin.from("chat_threads").update({ staff_cleared_at: a.thread.last_patient_at }).eq("id", a.thread.id);
    return NextResponse.json({ ok: true, waiting: false });
  }

  const text = cleanBody(body.text);
  if (!text) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  const id = await saveMessage(a.admin, a.thread, { id: a.user.id, role: "dietitian", name: a.me.name }, text);
  if (!id) return NextResponse.json({ error: "This did not send. Please try again." }, { status: 500 });
  after(() => pushTo(a.admin, [a.thread.patient_id], {
    title: `New message from ${a.me.name}`,
    body: "Tap to read it on GluFloat.",
    url: "/app?chat=1",
    tag: "glufloat-chat",
  }));
  return NextResponse.json(
    { ok: true, waiting: false, messages: await threadMessages(a.admin, a.thread.id, a.user.id, false, Number(body.after ?? 0) || 0) },
    { headers: NO_STORE },
  );
}
