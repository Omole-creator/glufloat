import { NextResponse } from "next/server";
import webpush from "web-push";
import type { RequestOptions } from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import { currentMeal, type NamedMeal } from "@/lib/mealtime";

// web-push needs Node, not the edge runtime, and this must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send the meal-time reminder to every subscribed device.
 *
 * This is called by a cron three times a day with the shared secret. It is NOT
 * public: without the secret it refuses. The money-free trigger is any scheduler
 * that can POST a URL, e.g. Supabase pg_cron or cron-job.org; Vercel's own cron
 * on the free plan only runs once a day, so it is not used for the three daily
 * sends. The exact set-up is written down in supabase/SETUP.md.
 *
 * **The words live here, not in the cron.** The scheduler only has to POST the
 * URL with the secret; which meal it is comes from the Nigerian clock, through
 * the same currentMeal() the app itself uses. If the cron carried the copy, the
 * house copy rules would not govern it and the three jobs would drift apart.
 *
 * A subscription the push service reports as gone (404 / 410) is deleted, so the
 * table does not fill with dead devices.
 */

/**
 * What to say at each meal. These three sends are at 07:00 / 12:00 / 17:00 WAT
 * (= 06:00 / 11:00 / 16:00 UTC), and they MUST stay in step with
 * checkBackMessage() in lib/mealtime.ts, which promises the person those very
 * times. Change one and you must change the other, or the app promises a
 * reminder that never arrives.
 */
const MEAL_PUSH: Record<NamedMeal, { title: string; body: string }> = {
  breakfast: {
    title: "Your breakfast is ready.",
    body: "Open Glufloat to see what to eat this morning.",
  },
  lunch: {
    title: "Your lunch is ready.",
    body: "Open Glufloat to see what to eat this afternoon.",
  },
  dinner: {
    title: "Your dinner is ready.",
    body: "Open Glufloat to see what to eat this evening.",
  },
};

/**
 * How the reminder travels. These three fields are the fix for a real bug, and
 * none of them is decoration: without them the 7am breakfast reminder landed on
 * an Android phone at about 11am, every single day, while lunch and dinner were
 * always on time.
 *
 * `urgency: "high"` is the one that matters. The Web Push default is `normal`,
 * and Chrome delivers through FCM, which deliberately HOLDS a normal-urgency
 * message while the handset is dozing and flushes it at the next real wake. At
 * midday and 5pm the phone is already in someone's hand, so the batching never
 * showed; at 7am the phone had been idle on a table all night, so breakfast sat
 * queued until it was picked up. High urgency is what allows the send to wake it.
 *
 * `TTL` is four hours, because **a meal reminder must never outlive its meal.**
 * Breakfast is sent at 07:00 WAT and its band ends at 10:59 (see currentMeal in
 * lib/mealtime.ts), so four hours is exactly its useful life, and it also keeps
 * lunch (12:00, ends 16:59) and dinner (17:00, ends 23:59) inside their own
 * bands. web-push otherwise defaults to FOUR WEEKS, which is why the late
 * breakfast was always delivered eventually instead of being dropped. A phone
 * that is offline all morning now gets nothing, on purpose: "Your breakfast is
 * ready" arriving at lunchtime is worse than silence.
 *
 * `topic` matches the `tag` the service worker already uses (public/sw.js), so
 * a reminder still pending when the next one is sent is REPLACED rather than
 * stacked. Belt and braces behind the TTL.
 */
const MEAL_PUSH_OPTIONS = {
  urgency: "high",
  TTL: 4 * 60 * 60,
  topic: "glufloat-mealtime",
} as const satisfies RequestOptions;

export async function POST(request: Request) {
  const secret = process.env.PUSH_CRON_SECRET;
  const given =
    new URL(request.url).searchParams.get("secret") ||
    request.headers.get("x-cron-secret");
  if (!secret || given !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(
    // A real mailbox: this is who the push services contact if a send goes
    // wrong, so it must not be an address nobody reads.
    process.env.VAPID_SUBJECT || "mailto:glufloat@gmail.com",
    publicKey,
    privateKey,
  );

  // The meal happening in Nigeria right now decides the words. A title/body in
  // the request still wins, so a send can be tested out of hours.
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };
  const meal = currentMeal();
  const payload = JSON.stringify({
    title: body.title || MEAL_PUSH[meal].title,
    body: body.body || MEAL_PUSH[meal].body,
    url: "/app",
  });

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let removed = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          payload,
          MEAL_PUSH_OPTIONS,
        );
        sent += 1;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
          removed += 1;
        }
      }
    }),
  );

  return NextResponse.json({ meal, total: subs?.length ?? 0, sent, removed });
}
