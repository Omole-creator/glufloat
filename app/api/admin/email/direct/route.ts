import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { cleanEmailHtml } from "@/lib/mailyte";
import {
  directEmailHtml,
  fileProblem,
  htmlToText,
  isEmail,
  isSendKey,
  newSendKey,
  sendDirectEmail,
  senderFor,
  type DirectAttachment,
} from "@/lib/directEmail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Send one email, with files, to one person, hospital or HMO. Multipart form. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The files are too big to send. Keep them under 4MB in total." }, { status: 413 });
  }
  const str = (k: string) => String(form.get(k) ?? "").trim();

  const sender = senderFor(str("from"));
  if (!sender) return NextResponse.json({ error: "Pick who it is from." }, { status: 400 });
  const toName = str("toName");
  if (!toName) return NextResponse.json({ error: "Type their name." }, { status: 400 });
  if (toName.length > 120) return NextResponse.json({ error: "The name is too long." }, { status: 400 });
  const toEmail = str("toEmail").toLowerCase();
  if (!isEmail(toEmail)) return NextResponse.json({ error: "Type a real email address for them." }, { status: 400 });
  const cc = str("cc")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const badCc = cc.find((c) => !isEmail(c));
  if (badCc) return NextResponse.json({ error: `${badCc} is not a real email address.` }, { status: 400 });
  if (cc.length > 10) return NextResponse.json({ error: "Copy at most 10 people." }, { status: 400 });
  const subject = str("subject");
  if (!subject) return NextResponse.json({ error: "Type a subject." }, { status: 400 });
  if (subject.length > 200) return NextResponse.json({ error: "The subject is too long." }, { status: 400 });
  const body = cleanEmailHtml(str("html"));
  if (!body.replace(/<[^>]+>/g, "").trim()) return NextResponse.json({ error: "Write the message." }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const problem = fileProblem(files);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const attachments: DirectAttachment[] = await Promise.all(
    files.map(async (f) => ({
      name: f.name.replace(/[\r\n"]/g, "").slice(0, 150) || "file",
      content: Buffer.from(await f.arrayBuffer()).toString("base64"),
      content_type: f.type || "application/octet-stream",
    })),
  );

  const givenKey = str("sendKey").toUpperCase();
  const sendKey = isSendKey(givenKey) ? givenKey : newSendKey();

  const html = directEmailHtml(subject, sender.name, body);
  const sent = await sendDirectEmail({
    from: sender.email,
    to: toEmail,
    cc,
    subject,
    html,
    text: htmlToText(body),
    attachments,
    sendKey,
  });
  if (!sent.ok) {
    const notSender = /verified sender|from address/i.test(sent.detail);
    return NextResponse.json(
      {
        error: notSender
          ? `${sender.email} is not a verified sender in Mailyte yet. Add it in Mailyte (Sending, Senders), confirm the email Mailyte sends to it, then try again.`
          : sent.status === 409 || sent.status === null
            ? sent.detail
            : `Mailyte did not send it: ${sent.detail}`,
      },
      { status: 502 },
    );
  }

  // The list. The email has already gone; a list that is not ready yet
  // (#33 not run) must never turn a sent email into an error.
  // A retry of an email that already went gets Mailyte's first answer back
  // (same message id): it is already on the list, so it is not added twice.
  // The database sometimes stalls for many seconds; the list must never keep
  // the page on "Sending..." after the email has gone, so it gets 8 seconds.
  let saved = false;
  try {
    const db = createAdminClient();
    const write = async () => {
      if (sent.messageId) {
        const { data: had } = await db.from("direct_emails").select("id").eq("message_id", sent.messageId).limit(1);
        if (had && had.length) return true;
      }
      const { error } = await db
      .from("direct_emails")
      .insert({
        from_email: sender.email,
        to_name: toName,
        to_email: toEmail,
        cc: cc.length ? cc.join(", ") : null,
        subject,
        html: body,
        attachments: attachments.map((a) => a.name),
        message_id: sent.messageId,
      });
      return !error;
    };
    saved = await Promise.race([write(), new Promise<boolean>((r) => setTimeout(() => r(false), 8000))]);
  } catch {
    saved = false;
  }

  return NextResponse.json({
    ok: true,
    saved,
    message: `Sent to ${toName} (${toEmail})${attachments.length ? ` with ${attachments.length} ${attachments.length === 1 ? "file" : "files"}` : ""}.`,
  });
}

/** Remove one email from the list. The email itself cannot be unsent. */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Unknown email." }, { status: 400 });
  const { error } = await createAdminClient().from("direct_emails").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not remove it. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
