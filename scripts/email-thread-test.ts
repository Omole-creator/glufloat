/**
 * The conversation rules for /admin/email (lib/emailThread.ts) and the Gmail
 * link for creators. Run: npx tsx scripts/email-thread-test.ts
 */
import { gmailKey, normalizeMessageId, replyCc, replyRecipient, replySubject, stripQuoted, threadHeaders, waitingForUs } from "../lib/emailThread";
import { gmailThreadUrl } from "../lib/creatorOutreach";

let failed = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  if (ok) console.log(`ok   ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name}`, got === undefined ? "" : JSON.stringify(got));
  }
};

check("subject gets Re:", replySubject("The partnership") === "Re: The partnership");
check("no Re: Re:", replySubject("RE: The partnership") === "RE: The partnership");
check("id gets brackets", normalizeMessageId("abc@x.com") === "<abc@x.com>");
check("id keeps brackets", normalizeMessageId("<abc@x.com>") === "<abc@x.com>");
check("bad id is null", normalizeMessageId("a b") === null && normalizeMessageId("") === null);

const first = "<01M59Y32KKQYVR53KZG6SEQXEG@glufloat.com>";
const msgs = [
  { at: "2026-10-20T10:00:00Z", direction: "out" as const, from_email: "hospital@glufloat.com", message_id: "<o1@glufloat.com>" },
  { at: "2026-10-19T12:00:00Z", direction: "in" as const, from_email: "Eva@Hospital.com", message_id: "<i1@mail.gmail.com>" },
  { at: "2026-10-21T09:00:00Z", direction: "in" as const, from_email: "md@hospital.com", message_id: "<i2@mail.gmail.com>" },
];
const h = threadHeaders(first, msgs);
check("In-Reply-To is the newest message", h["In-Reply-To"] === "<i2@mail.gmail.com>", h);
check("References oldest first", h.References === `${first} <i1@mail.gmail.com> <o1@glufloat.com> <i2@mail.gmail.com>`, h);
check("no headers with no ids", Object.keys(threadHeaders(null, [])).length === 0);
const withGmail = threadHeaders(first, [{ at: "2026-10-19T12:00:00Z", message_id: gmailKey("1a19b8bb5f996102") }]);
check("a reply saved by Gmail id never goes in the headers", withGmail["In-Reply-To"] === first && withGmail.References === first, withGmail);
check("gmail key is not a Message-ID", normalizeMessageId(gmailKey("1a19b8bb5f996102")) === null && normalizeMessageId("no-at-sign") === null);
const many = Array.from({ length: 30 }, (_, i) => ({ at: new Date(Date.UTC(2026, 9, 1, i)).toISOString(), message_id: `<m${i}@x>` }));
const hm = threadHeaders(first, many);
check("long References keeps first + newest 15", hm.References.split(" ").length === 16 && hm.References.startsWith(first) && hm.References.endsWith("<m29@x>"));

check("answer goes to whoever wrote last", replyRecipient("eva@hospital.com", msgs) === "md@hospital.com");
check("no replies: the first person", replyRecipient("Eva@Hospital.com", []) === "eva@hospital.com");
check("cc drops recipient, us, repeats", JSON.stringify(replyCc("a@x.com, md@hospital.com; hmo@glufloat.com a@x.com", "md@hospital.com")) === '["a@x.com"]');

check("waiting when they wrote last", waitingForUs(msgs));
check("not waiting after our answer", !waitingForUs([...msgs, { at: "2026-10-22T09:00:00Z", direction: "out" }]));
check("not waiting after No answer needed", !waitingForUs(msgs, "2026-10-21T10:00:00Z"));
check("waiting again after a newer reply", waitingForUs(msgs, "2026-10-21T08:00:00Z"));
check("nothing yet is not waiting", !waitingForUs([]));

const gmailReply = "Good\n\nOn Mon, Oct 19, 2026, 12:17 PM Glufloat for Hospital <hospital@glufloat.com>\nwrote:\n\n> Hello eva,\n> Attached is the email.";
check("cuts the quoted email (wrapped On...wrote)", stripQuoted(gmailReply) === "Good", stripQuoted(gmailReply));
check("cuts On ... wrote: on one line", stripQuoted("Yes please.\nThanks\nOn Tue, 3 Nov 2026 at 09:00, A <a@b.com> wrote:\n> x") === "Yes please.\nThanks");
check("cuts Outlook Original Message", stripQuoted("Noted.\n-----Original Message-----\nFrom: x") === "Noted.");
check("cuts Outlook From/Sent block", stripQuoted("Fine by us.\n\nFrom: Glufloat <hmo@glufloat.com>\nSent: Monday\nTo: us") === "Fine by us.");
check("keeps a reply with no quote", stripQuoted("We are interested. Call 0803 000 0000.") === "We are interested. Call 0803 000 0000.");
check("all quote: keeps the text", stripQuoted("> only quote") === "> only quote");

check(
  "gmail link uses Gmail's own thread form",
  gmailThreadUrl("1a19b5bf5dc7b50c") === "https://mail.google.com/mail/?authuser=glufloat@gmail.com#all/thread-f:1880734152920642828",
  gmailThreadUrl("1a19b5bf5dc7b50c"),
);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
