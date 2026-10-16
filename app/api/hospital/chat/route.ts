import { NextResponse, after } from "next/server";
import { cleanBody, isWaiting } from "@/lib/chat";
import { hospitalLive } from "@/lib/hospitalPlans";
import { staffContext, type StaffContext } from "@/lib/hospitalServer";
import { canAnswer, chatReady, senderRoleFor, findThread, pushTo, saveMessage, threadMessages, times } from "@/lib/chatServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The care team's side of a patient's chat, from the patient's page. Anyone
 * at the hospital can read it (they can already read the whole record);
 * doctors and dietitians answer, and so does a dietitian who runs her own
 * practice. Only while the patient is using one of the hospital's places.
 */
async function patientFor(ctx: StaffContext, id: string) {
  if (!hospitalLive(ctx.hospital)) return null;
  const { data } = await ctx.admin
    .from("hospital_patients")
    .select("id,user_id,status,name")
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id)
    .maybeSingle();
  if (!data || !data.user_id || data.status !== "active") return null;
  return { rowId: data.id as string, userId: data.user_id as string, name: data.name as string };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ctx = await staffContext(url.searchParams.get("hid"));
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!(await chatReady(ctx.admin))) return NextResponse.json({ ready: false }, { headers: NO_STORE });
  const p = await patientFor(ctx, String(url.searchParams.get("id") ?? ""));
  if (!p) return NextResponse.json({ error: "This patient is not using one of your places." }, { status: 404 });
  const thread = await findThread(ctx.admin, p.userId, { hospitalId: ctx.hospital.id }, false);
  const after = Number(url.searchParams.get("after") ?? 0) || 0;
  return NextResponse.json(
    {
      ready: true,
      canSend: canAnswer(ctx.staff.role, ctx.hospital),
      waiting: thread ? isWaiting(times(thread)) : false,
      messages: thread ? await threadMessages(ctx.admin, thread.id, ctx.user.id, false, after) : [],
    },
    { headers: NO_STORE },
  );
}

/** Answer the patient ({text}), or mark that no answer is needed ({action: "clear"}). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(String(body.hid ?? "") || null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!canAnswer(ctx.staff.role, ctx.hospital))
    return NextResponse.json({ error: "Only doctors and dietitians answer patients' messages." }, { status: 403 });
  if (!(await chatReady(ctx.admin))) return NextResponse.json({ error: "Chat is not ready yet." }, { status: 503 });
  const p = await patientFor(ctx, String(body.id ?? ""));
  if (!p) return NextResponse.json({ error: "This patient is not using one of your places." }, { status: 404 });

  if (body.action === "clear") {
    const thread = await findThread(ctx.admin, p.userId, { hospitalId: ctx.hospital.id }, false);
    // Handled up to the patient's last message, in the database's own time.
    if (thread?.last_patient_at) await ctx.admin.from("chat_threads").update({ staff_cleared_at: thread.last_patient_at }).eq("id", thread.id);
    return NextResponse.json({ ok: true, waiting: false });
  }

  const text = cleanBody(body.text);
  if (!text) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  const thread = await findThread(ctx.admin, p.userId, { hospitalId: ctx.hospital.id }, true);
  if (!thread) return NextResponse.json({ error: "This did not send. Please try again." }, { status: 500 });
  const role = senderRoleFor(ctx.staff.role, ctx.hospital);
  const id = await saveMessage(ctx.admin, thread, { id: ctx.user.id, role, name: ctx.staff.name }, text);
  if (!id) return NextResponse.json({ error: "This did not send. Please try again." }, { status: 500 });

  after(() => pushTo(ctx.admin, [p.userId], {
    title: `New message from ${ctx.staff.name}`,
    body: "Tap to read it on GluFloat.",
    url: "/app?chat=1",
    tag: "glufloat-chat",
  }));
  return NextResponse.json(
    { ok: true, waiting: false, messages: await threadMessages(ctx.admin, thread.id, ctx.user.id, false, Number(body.after ?? 0) || 0) },
    { headers: NO_STORE },
  );
}
