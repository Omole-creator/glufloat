/**
 * Tests for the in-app chat's rules (lib/chat.ts): what counts as a message,
 * when a patient is "waiting", when a reply is "unread", and the labels.
 *
 *   npx tsx scripts/chat-test.ts
 *
 * Run this after ANY edit to lib/chat.ts. "Waiting" drives the red badges a
 * doctor sees and the admin's chase list; get it wrong and a patient's
 * question sits unanswered with nothing on any screen saying so.
 */
import { CHAT_MAX, CHASE_AFTER_MS, cleanBody, clockLabel, dayLabel, isWaiting, unreadForPatient, waitLabel, waitingSince, watDay } from "../lib/chat";

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

const T = (h: number) => new Date(Date.UTC(2026, 9, 15, h, 0, 0)).toISOString();
const none = { lastPatientAt: null, lastStaffAt: null, patientReadAt: null, staffClearedAt: null };

// --- cleanBody -------------------------------------------------------------
check("empty is nothing", cleanBody("") === null);
check("spaces are nothing", cleanBody("   \n\n  ") === null);
check("undefined is nothing", cleanBody(undefined) === null);
check("trimmed", cleanBody("  hello  ") === "hello");
check("windows line ends", cleanBody("a\r\nb") === "a\nb");
check("many blank lines squeezed", cleanBody("a\n\n\n\n\nb") === "a\n\nb");
check("cut at the limit", (cleanBody("x".repeat(CHAT_MAX + 50)) ?? "").length === CHAT_MAX);
check("a number stays a number (never read as a sugar test)", cleanBody("My sugar was 45") === "My sugar was 45");

// --- waiting ---------------------------------------------------------------
check("nobody wrote: not waiting", !isWaiting(none));
check("patient wrote, no answer: waiting", isWaiting({ ...none, lastPatientAt: T(9) }));
check("answered after: not waiting", !isWaiting({ ...none, lastPatientAt: T(9), lastStaffAt: T(10) }));
check("wrote again after the answer: waiting", isWaiting({ ...none, lastPatientAt: T(11), lastStaffAt: T(10) }));
check("no reply needed after: not waiting", !isWaiting({ ...none, lastPatientAt: T(9), staffClearedAt: T(10) }));
check("wrote again after no reply needed: waiting", isWaiting({ ...none, lastPatientAt: T(11), staffClearedAt: T(10) }));
check("team wrote first, patient silent: not waiting", !isWaiting({ ...none, lastStaffAt: T(10) }));
check("patient reading the chat does not change waiting", isWaiting({ ...none, lastPatientAt: T(9), patientReadAt: T(12) }));
check("waitingSince is the patient's last message", waitingSince({ ...none, lastPatientAt: T(9) }) === T(9));
check("waitingSince null when answered", waitingSince({ ...none, lastPatientAt: T(9), lastStaffAt: T(10) }) === null);

// --- unread for the patient --------------------------------------------------
check("no team message: nothing unread", !unreadForPatient({ ...none, lastPatientAt: T(9) }));
check("team wrote, never opened: unread", unreadForPatient({ ...none, lastStaffAt: T(10) }));
check("opened after: read", !unreadForPatient({ ...none, lastStaffAt: T(10), patientReadAt: T(11) }));
check("team wrote after opening: unread", unreadForPatient({ ...none, lastStaffAt: T(12), patientReadAt: T(11) }));

// --- labels ----------------------------------------------------------------
const now = Date.UTC(2026, 9, 15, 12, 0, 0);
check("under a minute reads 1 min", waitLabel(new Date(now - 10_000).toISOString(), now) === "1 min");
check("minutes", waitLabel(new Date(now - 25 * 60000).toISOString(), now) === "25 min");
check("one hour", waitLabel(new Date(now - 61 * 60000).toISOString(), now) === "1 hour");
check("hours", waitLabel(new Date(now - 5 * 3600000).toISOString(), now) === "5 hours");
check("one day", waitLabel(new Date(now - 30 * 3600000).toISOString(), now) === "1 day");
check("days", waitLabel(new Date(now - 3 * 86400000).toISOString(), now) === "3 days");
check("chase is after one day", CHASE_AFTER_MS === 86400000);

// Nigerian clock: 13:05 UTC is 2:05pm WAT; 23:30 UTC is already the next day in Nigeria.
check("clock in WAT", clockLabel("2026-10-15T13:05:00Z") === "2:05pm", clockLabel("2026-10-15T13:05:00Z"));
check("midnight hour reads 12", clockLabel("2026-10-15T23:10:00Z") === "12:10am", clockLabel("2026-10-15T23:10:00Z"));
check("WAT day rolls at 23:00 UTC", watDay("2026-10-15T23:30:00Z") === "2026-10-16");
check("today", dayLabel("2026-10-15", now) === "Today");
check("yesterday", dayLabel("2026-10-14", now) === "Yesterday");
check("older shows a date", /12 Oct/.test(dayLabel("2026-10-12", now)), dayLabel("2026-10-12", now));

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
