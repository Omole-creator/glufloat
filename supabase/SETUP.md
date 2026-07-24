# Glufloat Phase-2 setup (Supabase + Paystack accounts)

This is the one-time setup you do in the dashboards. Once these are done and the
keys are in Vercel, the app code (which I'm building) takes over.

## 1. Supabase

1. In your Supabase project → **SQL Editor** → paste and run `schema.sql`
   (this file's neighbour). It creates the `profiles`, `subscriptions`, and
   `payments` tables, security rules, and the auto-profile trigger.
2. **Authentication → Providers → Email**: enable it, and **turn OFF
   "Confirm email"** (so no confirmation email is sent — your requirement).
3. **Project Settings → API**: copy these three values for step 3 below:
   - Project URL
   - `anon` public key
   - `service_role` secret key (server-only — never shipped to the browser)

## 2. Paystack

1. **Settings → API Keys & Webhooks**: copy your **Secret key** (starts `sk_`).
2. Set the **Webhook URL** to:
   `https://glufloat.vercel.app/api/paystack/webhook`
   (this is the endpoint I'm building — it verifies each payment and updates the
   subscriber's record, which is what stops URL sharing and powers churn/MRR).
3. On your **Payment Page** (paystack.shop/pay/glufloat), keep the ₦1,500 plan.
   We pass the signed-in user's email so the webhook can match payment → user.
   (The old redirect-to-`/unlock?code=` trick is no longer needed once accounts
   are live.)

## 3. Vercel environment variables

Project → **Settings → Environment Variables** (Production + Preview):

| Name | Value | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | yes (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | yes (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | **no — server only** |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (`sk_...`) | **no — server only** |
| `ADMIN_PASSWORD` | a strong password you choose | **no — server only** |

The three server-only keys must **never** have the `NEXT_PUBLIC_` prefix, so
they stay on the server and out of the browser bundle.

## 4. Meal-time reminders (web push)

The reminder is the trigger that brings people back, so this is the step that
turns the habit layer on. Until `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set, the
opt-in card never even appears, and nothing is ever sent.

**a. Make the keys, once.** From `glufloat-web/`:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

**b. Add five variables** to `.env.local` and to Vercel (Production + Preview):

| Name | Value | Exposed to browser? |
|---|---|---|
| `VAPID_PUBLIC_KEY` | the public key from step a | **no — server only** |
| `VAPID_PRIVATE_KEY` | the private key from step a | **no — server only** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the **same value** as the public key | yes (public) |
| `PUSH_CRON_SECRET` | a long random string you choose | **no — server only** |
| `VAPID_SUBJECT` | `mailto:glufloat@gmail.com` (a real mailbox) | **no — server only** |

**c. Schedule three sends a day.** Use a free scheduler that can POST a URL
(cron-job.org, or Supabase `pg_cron` + `pg_net`). **Not Vercel Hobby cron**,
which only runs once a day.

Three jobs, all POSTing `https://www.glufloat.com/api/push/send` with the header
`x-cron-secret: <PUSH_CRON_SECRET>` and an empty body:

| Job | UTC (what the scheduler wants) | Nigerian time | What it says |
|---|---|---|---|
| breakfast | `0 6 * * *` | 07:00 WAT | "Your breakfast is ready." |
| lunch | `0 11 * * *` | 12:00 WAT | "Your lunch is ready." |
| dinner | `0 16 * * *` | 17:00 WAT | "Your dinner is ready." |

The words are **not** set in the scheduler. The route works out which meal it is
from the Nigerian clock and picks the wording itself (`MEAL_PUSH` in
`app/api/push/send/route.ts`). The three times must stay in step with
`checkBackMessage()` in `lib/mealtime.ts`, which promises the person those very
times inside the app.

**Three timezone traps, all of which bit during the first set-up.** The founder's
machine is on US Pacific while every user is in Nigeria, so anything that
auto-detects a timezone is 7 or 8 hours out:

1. **The scheduler auto-detects YOUR timezone, not your users'.** cron-job.org
   read the browser and set the account to US Pacific.
2. **The account timezone and the JOB timezone are two different settings.**
   Changing the account to `Africa/Lagos` left the existing job on UTC, so a job
   reading "7:00 AM" in the edit screen was really 7:00 UTC, i.e. 8am in Lagos
   and an hour late. Setting the account is not enough.
3. **The job list and the edit screen print different timezones** (the list uses
   the browser, the edit screen the job), so the two screens disagree and neither
   is lying.

Because of 2 and 3, **do not trust a time you read on the schedule screen.**
Verify from the job list's "Next execution" instead, which is the same moment
expressed in your own timezone. From US Pacific, correct looks like:

| Job | Next execution, seen from US Pacific | Wrong (job still on UTC) |
|---|---|---|
| breakfast | 11:00 PM | 12:00 AM |
| lunch | 4:00 AM | 5:00 AM |
| dinner | 9:00 AM | 10:00 AM |

The app itself is immune to all of this: `watHour()` fixes Nigeria at UTC+1 and
never reads the device clock. Only outside tools need watching.

**d. Check it.** A correct call answers with JSON naming the meal and how many
devices were reached, and a wrong secret answers 401:

```bash
curl -X POST "https://www.glufloat.com/api/push/send" -H "x-cron-secret: <secret>"
# {"meal":"lunch","total":1,"sent":1,"removed":0}
```

Two honest limits, and they are already said in the opt-in copy: an iPhone must
have Glufloat added to the home screen first, and some older Android phones
suppress push. That is why the in-app greeting is the baseline and push is the
extra nudge.

**A third limit, and the reason the send is set up the way it is.** The 7am
reminder used to land at about 11am on an Android phone, every day, while lunch
and dinner were always on time. Nothing was wrong with the cron: the message
still said "Your breakfast is ready", which only happens when the route really
did run in the morning. The phone was the delay. Chrome delivers through FCM,
which holds an ordinary-urgency message while the handset is dozing overnight and
hands it over when it is next picked up. The route now sends **high urgency**
with a **four-hour life**, so the reminder may wake a sleeping phone and can
never be shown after its own meal has passed (`MEAL_PUSH_OPTIONS` in
`app/api/push/send/route.ts`). Even so, a phone in battery saver, or one of the
Android skins that force-stop background apps (Tecno, Infinix, Xiaomi, Oppo), can
still hold it — and it is now **dropped rather than shown late**, on purpose.
"Your breakfast is ready" arriving at lunchtime is worse than silence.

**e. Never rotate the keys once devices have subscribed.** A VAPID keypair is
what a browser's push service checks a send against, so replacing it silently
orphans every existing subscription: the rows stay in `push_subscriptions`, the
sends fail, and nobody is told. Rotating cost nothing on 2026-07-22 only because
the table held **0 rows**. Check that count before ever changing them again:

```sql
select count(*) from push_subscriptions;
```

**A NEXT_PUBLIC_ value is baked in at BUILD time, not read at run time.** Setting
it on Vercel does nothing until the next deploy. To prove a deploy really carries
it, load `/app` signed in and search the JavaScript it fetches for the key: it
lives in a lazily-loaded chunk, so it is NOT in the initial HTML and NOT in the
first chunks the page references. Looking only there gives a false negative.

## What I build once the above is in place
- Supabase client (browser + server) and session middleware.
- `/signup` (name, email, password) and `/signin` (email, password); no email
  confirmation.
- Gate: browsing is free, but tapping **Start my free trial** requires sign-in,
  and the 3-day trial + subscription state move from `localStorage` to the
  user's record.
- `/api/paystack/webhook` — verifies Paystack events, updates `subscriptions`
  and `payments`.
- `/admin` — one password-protected screen: signups, active trials, trial→paid
  conversion, active subscribers, MRR, churn, and retention by cohort.
