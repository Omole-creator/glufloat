import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { cleanEmailHtml } from "@/lib/mailyte";
import {
  directEmailHtml,
  fileProblem,
  htmlToText,
  isSendKey,
  newSendKey,
  sendDirectEmail,
  senderFor,
  type DirectAttachment,
} from "@/lib/directEmail";
import { byTime, replyCc, replyRecipient, replySubject, threadHeaders, type ThreadMessage } from "@/lib/emailThread";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NOT_READY = "Answering is waiting for the database update. Run supabase/direct-email-thread-schema.sql (#39 in SETUP.md).";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * Answer a conversation started from /admin/email (2026-11-02). Sent from
 * the SAME address as the first email, to whoever wrote last, with
 * In-Reply-To and References so it threads in their inbox. Multipart form:
 * emailId, html, sendKey, files.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The files are too big to send. Keep them under 4MB in total." }, { status: 413 });
  }
  const str = (k: string) => String(form.get(k) ?? "").trim();

  const emailId = str("emailId");
  if (!/^[0-9a-f-]{36}$/i.test(emailId)) return NextResponse.json({ error: "Unknown email." }, { status: 400 });
  const body = cleanEmailHtml(str("html"));
  if (!body.replace(/<[^>]+>/g, "").trim()) return NextResponse.json({ error: "Write your answer." }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const problem = fileProblem(files);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const db = createAdminClient();
  const { data: first } = await db
    .from("direct_emails")
    .select("id, from_email, to_name, to_email, cc, subject, message_id")
    .eq("id", emailId)
    .maybeSingle();
  if (!first) return NextResponse.json({ error: "That email is no longer on the list." }, { status: 404 });
  const { data: rows, error: readErr } = await db.from("direct_email_messages").select("*").eq("email_id", emailId);
  if (readErr) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  const messages = ((rows ?? []) as ThreadMessage[]).sort(byTime);

  const sender = senderFor(first.from_email);
  if (!sender) return NextResponse.json({ error: `${first.from_email} is no longer one of the From addresses.` }, { status: 400 });

  const to = replyRecipient(first.to_email, messages);
  const cc = replyCc(first.cc, to);
  const subject = replySubject(first.subject);
  const headers = threadHeaders(first.message_id, messages);

  // Their last message, quoted under the answer, the way a mail app does.
  const lastIn = messages.filter((m) => m.direction === "in" && m.body_text).pop();
  const quote = lastIn
    ? `<p style="margin-top:24px;color:#5b6b7e;font-size:13px">On ${esc(when(lastIn.at))}, ${esc(lastIn.from_name || lastIn.from_email || "they")} wrote:</p>` +
      `<blockquote style="margin:0;padding-left:12px;border-left:3px solid #e3e9f1;color:#5b6b7e;font-size:14px">${esc(lastIn.body_text ?? "").replace(/\n/g, "<br>")}</blockquote>`
    : "";

  const attachments: DirectAttachment[] = await Promise.all(
    files.map(async (f) => ({
      name: f.name.replace(/[\r\n"]/g, "").slice(0, 150) || "file",
      content: Buffer.from(await f.arrayBuffer()).toString("base64"),
      content_type: f.type || "application/octet-stream",
    })),
  );

  const givenKey = str("sendKey").toUpperCase();
  const sent = await sendDirectEmail({
    from: sender.email,
    to,
    cc,
    subject,
    html: directEmailHtml(subject, sender.name, body + quote),
    text: htmlToText(body) + (lastIn ? `\n\nOn ${when(lastIn.at)}, ${lastIn.from_name || lastIn.from_email} wrote:\n> ${(lastIn.body_text ?? "").split("\n").join("\n> ")}` : ""),
    attachments,
    sendKey: isSendKey(givenKey) ? givenKey : newSendKey(),
    headers,
  });
  // A retry after the first try went: the conversation (and so the headers)
  // has changed, Mailyte sees the same key on a different request and
  // refuses it. Nothing went twice; say so plainly.
  if (!sent.ok && /idempotency-key was already used/i.test(sent.detail))
    return NextResponse.json({ error: "This answer has already gone. Refresh the page to see it." }, { status: 409 });
  if (!sent.ok)
    return NextResponse.json(
      { error: sent.status === 409 || sent.status === null ? sent.detail : `Mailyte did not send it: ${sent.detail}` },
      { status: 502 },
    );

  // The answer has gone; recording it gets 8 seconds (the database stalls
  // now and then) and never turns a sent answer into an error. A retry that
  // Mailyte answered from its first try (same message id) is not added twice.
  let saved = false;
  try {
    const write = async () => {
      const { error } = await db.from("direct_email_messages").upsert(
        {
          email_id: emailId,
          direction: "out",
          from_email: sender.email,
          from_name: sender.name,
          to_email: to,
          cc: cc.length ? cc.join(", ") : null,
          subject,
          html: body,
          body_text: htmlToText(body),
          message_id: sent.messageId,
          in_reply_to: headers["In-Reply-To"] ?? null,
          refs: headers.References ?? null,
        },
        { onConflict: "message_id", ignoreDuplicates: true },
      );
      return !error;
    };
    saved = await Promise.race([write(), new Promise<boolean>((r) => setTimeout(() => r(false), 8000))]);
  } catch {
    saved = false;
  }

  return NextResponse.json({
    ok: true,
    saved,
    message: `Your answer went to ${to}${attachments.length ? ` with ${attachments.length} ${attachments.length === 1 ? "file" : "files"}` : ""}.`,
  });
}
