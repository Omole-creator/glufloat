import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { cleanBody, unreadForPatient } from "@/lib/chat";
import {
  THREAD_COLS,
  chatReady,
  findThread,
  patientName,
  patientTeam,
  pushTo,
  saveMessage,
  threadMessages,
  times,
  type PatientTeam,
  type ThreadRow,
} from "@/lib/chatServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function teamKey(team: PatientTeam) {
  return team.kind === "hospital" ? { hospitalId: team.hospital.id } : { dietitianId: team.dietitianId };
}

function teamOut(team: PatientTeam) {
  return team.kind === "hospital"
    ? {
        kind: team.hospital.kind === "dietitian" ? ("practice" as const) : team.hospital.kind === "doctor" ? ("doctor" as const) : ("hospital" as const),
        name: team.hospital.name,
        members: team.members.map((m) => ({ name: m.name, role: m.role })),
        callPhone: team.callPhone,
        canSend: team.members.length > 0,
      }
    : {
        kind: "premium" as const,
        name: team.dietitianName,
        members: [{ name: team.dietitianName, role: "dietitian" as const }],
        callPhone: team.callPhone,
        canSend: !!team.dietitianUserId,
      };
}

/**
 * The patient's side of the chat.
 *   GET ?peek=1        just "is there a reply I have not read?", for the red dot
 *   GET [?after=<id>]  who the team is, and the messages (only newer ones with `after`)
 *   GET ...&read=1     also marks the chat read (the chat is on screen)
 * `ready: false` until supabase/chat-schema.sql runs: the app then shows the
 * old WhatsApp button instead, so nothing breaks before the update.
 */
export async function GET(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const admin = createAdminClient();
  if (!(await chatReady(admin))) return NextResponse.json({ ready: false }, { headers: NO_STORE });
  const url = new URL(request.url);

  if (url.searchParams.get("peek")) {
    const { data } = await admin.from("chat_threads").select(THREAD_COLS).eq("patient_id", user.id);
    const unread = ((data ?? []) as ThreadRow[]).some((t) => unreadForPatient(times(t)));
    return NextResponse.json({ ready: true, unread }, { headers: NO_STORE });
  }

  const team = await patientTeam(admin, user.id);
  if (!team) return NextResponse.json({ ready: true, team: null }, { headers: NO_STORE });
  const thread = await findThread(admin, user.id, teamKey(team), false);
  const after = Number(url.searchParams.get("after") ?? 0) || 0;
  const messages = thread ? await threadMessages(admin, thread.id, user.id, true, after) : [];
  // Read up to the newest team message, stamped with the database's own time
  // (never this server's clock, which can drift from it by seconds).
  if (thread && url.searchParams.get("read") && unreadForPatient(times(thread))) {
    await admin.from("chat_threads").update({ patient_read_at: thread.last_staff_at }).eq("id", thread.id);
  }
  return NextResponse.json({ ready: true, team: teamOut(team), messages }, { headers: NO_STORE });
}

/** The patient sends a message. Their care team gets a phone alert. */
export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const text = cleanBody(body.text);
  if (!text) return NextResponse.json({ error: "Type a message first." }, { status: 400 });

  const admin = createAdminClient();
  if (!(await chatReady(admin))) return NextResponse.json({ error: "Chat is not ready yet. Please try again later." }, { status: 503 });
  const team = await patientTeam(admin, user.id);
  if (!team) return NextResponse.json({ error: "Chat is part of GluFloat Premium." }, { status: 403 });
  const out = teamOut(team);
  if (!out.canSend) return NextResponse.json({ error: "Nobody is here to answer yet. Please try again later." }, { status: 409 });

  const thread = await findThread(admin, user.id, teamKey(team), true);
  if (!thread) return NextResponse.json({ error: "This did not send. Please try again." }, { status: 500 });
  const name = await patientName(admin, user.id);
  const id = await saveMessage(admin, thread, { id: user.id, role: "patient", name }, text);
  if (!id) return NextResponse.json({ error: "This did not send. Please try again." }, { status: 500 });

  const first = name.split(/\s+/)[0] || "A patient";
  if (team.kind === "hospital") {
    after(() => pushTo(
      admin,
      team.members.map((m) => m.userId),
      {
        title: `New message from ${first}`,
        body: `Tap to read it on GluFloat.`,
        url: `/hospital/patients/${team.patientRowId}?h=${team.hospital.id}#chat`,
        tag: `chat${thread.id}`,
      },
    ));
  } else if (team.dietitianUserId) {
    const to = team.dietitianUserId;
    after(() => pushTo(admin, [to], {
      title: `New message from ${first}`,
      body: "Tap to read it on GluFloat.",
      url: `/inbox/${thread.id}`,
      tag: `chat${thread.id}`,
    }));
  }
  const messages = await threadMessages(admin, thread.id, user.id, true, Number(body.after ?? 0) || 0);
  return NextResponse.json({ ok: true, messages }, { headers: NO_STORE });
}
