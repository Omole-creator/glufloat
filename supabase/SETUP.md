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
