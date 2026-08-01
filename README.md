# Glufloat

Know if a food is right for your diabetes, before you buy or eat it.

Marketing site + MVP web app: 251 curated Nigerian foods, traffic-light
verdicts (green / yellow / red), and a Meal Builder that always hands you
the fix that turns a plate green.

**Live:** https://glufloat.vercel.app

## How access works

Access is an **account** fact, not a device fact. The free-check allowance,
the shared unlock codes and the on-device trial described in older versions of
this file are all gone, along with Nestuge.

- Signing up creates a `profiles` row. `/app` is all-or-nothing: a visitor who
  is not signed in goes to `/signin`, and a signed-in person who has not
  started a trial goes to `/trial`.
- `/trial` stamps `profiles.trial_start` once. That gives a **7-day free
  trial**, no card. The length lives in `lib/trial.ts` (`TRIAL_DAYS`) and
  nowhere else; the database stores only the start moment, so the days left are
  worked out fresh on every read.
- Days left count by **calendar day**, not by 24 hours: the start day shows 7,
  the next local day 6, and the trial is over on the eighth day. The app warns
  on the last day.
- Payment is a one-time N1,500 page on **Paystack**, which sends the buyer back
  to `/unlock`. That claims the reference against the signed-in account and
  writes a `subscriptions` row good for 30 days. `/api/paystack/webhook` is the
  backup path. An active subscription is checked **before** the trial, so a
  paying member whose trial lapsed is never locked out.

`lib/account.ts` (`getAccess`) is the single answer to "what may this person
see": `anon | new | trial | subscribed | expired`.

## How you see people using it

Anonymous **usage events** go to Vercel Analytics (see `lib/analytics.ts`):
`trial_started`, `food_checked`, `meal_built`, `paywall_hit`,
`access_unlocked`. `/admin` has the real numbers behind them: signups, active
trials, trial-to-paid, MRR, churn and cohort retention.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
node scripts/qa.mjs        # Playwright end-to-end QA (needs dev server running)
npx tsx scripts/engine-test.ts   # verdict engine sanity tests
```

## Key files

- `data/foods.json` — the 251-food seed database (120 green / 91 yellow / 40 red)
- `lib/verdictEngine.ts` — meal scoring per the SPEC (hard-red for liquid sugar)
- `lib/access.ts` — free-check gating, unlock codes, Nestuge URL
- `app/page.tsx` — landing page
- `app/app/page.tsx` — the product (search + meal builder)
- `app/unlock/page.tsx` — post-payment access page

## Before public launch

- Have a Nigerian tech/health-law solicitor review /terms, /privacy, and
  /disclaimer (contact details are filled: GluFloat, Lagos State, Nigeria,
  glufloat@gmail.com, 0904 874 4395).
- Register the company with CAC before taking money, then add the RC number
  to the privacy page.
