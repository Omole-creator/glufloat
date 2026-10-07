import { NextResponse } from "next/server";
import webpush from "web-push";
import type { RequestOptions } from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import { displayLabel } from "@/lib/foodName";
import { timeLabel } from "@/lib/mealResponse";

// web-push needs Node, not the edge runtime, and this must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The 2-hour reminder of a MEAL TEST (lib/mealResponse.ts).
 *
 * Called every 10 minutes by a free scheduler with the same secret as the meal
 * reminders (supabase/SETUP.md §4). Each run finds the meal tests that started
 * between 1h55 and 3h ago, have not been reminded, and have no 2-hour test yet,
 * and sends ONE reminder to that person's own devices.
 *
 * Never twice: a meal is stamped `reminder_sent_at` BEFORE anything is sent, by
 * an update that only matches unstamped rows, so two overlapping runs cannot both
 * claim it. A meal whose person has no device is stamped too, so it is not looked
 * at again every 10 minutes.
 *
 * Needs supabase/meal-response-schema.sql. Until it is run, this answers 503 and
 * names the file, and the 2-hour check still works inside the app.
 */

/** Earliest a reminder goes out: just before the 2-hour mark. */
const FROM_MIN = 115;
/** Latest: a reminder after this would arrive too late to be a 2-hour test. */
const UNTIL_MIN = 180;

/**
 * High urgency, or a dozing Android phone holds it (the same bug the 7am meal
 * reminder had, see app/api/push/send/route.ts). The TTL ends the reminder at
 * the edge of the window the app still asks for the test in (4 hours after the
 * start), so a phone that was off does not get "test now" at bedtime.
 */
const OPTIONS = {
  urgency: "high",
  TTL: 60 * 60,
  topic: "glufloat-mealtest",
} as const satisfies RequestOptions;

export async function POST(request: Request) {
  const secret = process.env.PUSH_CRON_SECRET;
  const given =
    new URL(request.url).searchParams.get("secret") || request.headers.get("x-cron-secret");
  if (!secret || given !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:glufloat@gmail.com",
    publicKey,
    privateKey,
  );

  const admin = createAdminClient();
  const now = Date.now();
  const from = new Date(now - UNTIL_MIN * 60000).toISOString();
  const until = new Date(now - FROM_MIN * 60000).toISOString();

  const { data: due, error } = await admin
    .from("meal_checks")
    .select("id,user_id,label,started_at")
    .not("started_at", "is", null)
    .is("reminder_sent_at", null)
    .gte("started_at", from)
    .lte("started_at", until);
  if (error) {
    return NextResponse.json(
      { error: "Run supabase/meal-response-schema.sql first", detail: error.message },
      { status: 503 },
    );
  }
  if (!due || due.length === 0) return NextResponse.json({ due: 0, sent: 0 });

  // Claim them first, so an overlapping run cannot send the same reminder.
  const { data: claimed } = await admin
    .from("meal_checks")
    .update({ reminder_sent_at: new Date(now).toISOString() })
    .in("id", due.map((d) => d.id))
    .is("reminder_sent_at", null)
    .select("id");
  const mine = new Set((claimed ?? []).map((c) => c.id as number));
  const meals = due.filter((d) => mine.has(d.id as number));

  // Skip any meal already finished: a 2-hour test saved early needs no nudge.
  const { data: tested } = await admin
    .from("glucose_readings")
    .select("meal_check_id,context")
    .in("meal_check_id", meals.map((m) => m.id));
  const done = new Set(
    (tested ?? [])
      .filter((t) => t.context !== "before_meal")
      .map((t) => t.meal_check_id as number),
  );
  const toRemind = meals.filter((m) => !done.has(m.id as number));
  if (toRemind.length === 0) return NextResponse.json({ due: due.length, sent: 0 });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .in("user_id", [...new Set(toRemind.map((m) => m.user_id as string))]);

  let sent = 0;
  let removed = 0;
  await Promise.all(
    toRemind.flatMap((m) => {
      const payload = JSON.stringify({
        title: "Time for your 2-hour sugar test",
        body: `You started eating ${displayLabel(m.label as string)} at ${timeLabel(m.started_at as string)}. Test now and save it in GluFloat.`,
        url: "/app?mealtest=1",
        tag: "glufloat-mealtest",
      });
      return (subs ?? [])
        .filter((s) => s.user_id === m.user_id)
        .map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
              payload,
              OPTIONS,
            );
            sent += 1;
          } catch (e: unknown) {
            const code = (e as { statusCode?: number })?.statusCode;
            if (code === 404 || code === 410) {
              await admin.from("push_subscriptions").delete().eq("id", s.id);
              removed += 1;
            }
          }
        });
    }),
  );

  return NextResponse.json({ due: due.length, reminded: toRemind.length, sent, removed });
}
