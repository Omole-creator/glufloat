import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

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
 * sends.
 *
 * The three times, in Nigerian time (WAT, GMT+1), and the words to post with
 * each. These must stay in step with checkBackMessage() in lib/mealtime.ts,
 * which tells the person when to come back:
 *
 *   07:00 WAT = 06:00 UTC   "Good morning. Your breakfast is ready."
 *                           "Open Glufloat to see what to eat this morning."
 *   12:00 WAT = 11:00 UTC   "Your lunch is ready."
 *                           "Open Glufloat to see what to eat this afternoon."
 *   17:00 WAT = 16:00 UTC   "Your dinner is ready."
 *                           "Open Glufloat to see what to eat this evening."
 *
 * A subscription the push service reports as gone (404 / 410) is deleted, so the
 * table does not fill with dead devices.
 */
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
    process.env.VAPID_SUBJECT || "mailto:hello@glufloat.com",
    publicKey,
    privateKey,
  );

  // The cron can pass its own words (e.g. name the meal); otherwise a safe default.
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };
  const payload = JSON.stringify({
    title: body.title || "Before you eat, ask Glufloat",
    body: body.body || "About to eat? Check your meal on Glufloat first.",
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

  return NextResponse.json({ total: subs?.length ?? 0, sent, removed });
}
