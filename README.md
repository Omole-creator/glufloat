# Glufloat

Know if a food is right for your diabetes, before you buy or eat it.

Marketing site + MVP web app: 143 curated Nigerian foods, traffic-light
verdicts (green / yellow / red), and a Meal Builder that always hands you
the fix that turns a plate green.

**Live:** https://glufloat.vercel.app

## How access works (MVP)

- Visitors get **3 free checks** (tracked in their browser), then the paywall.
- The **7-day free trial** runs on the visitor's device: tapping "Start my
  free trial" (the `/trial` page) unlocks everything for 7 days. No card is
  collected, because Nestuge does not support pre-subscription trials.
- When the trial ends, the paywall points to **Nestuge** for the
  N1,500/month subscription: https://nestuge.com/glufloat
- After payment, Nestuge should send buyers to the unlock link so access
  opens on their device immediately:

```
https://glufloat.vercel.app/unlock?code=GLU-GREEN-2026
```

Accepted codes live in `lib/access.ts` (`ACCESS_CODES`). Change them there
and redeploy whenever you rotate codes. Put the current code (or the full
unlock link) in your Nestuge product's post-purchase delivery message.

> Note: this is link-based MVP gating on the buyer's device, not per-user
> accounts. Real auth + server-side subscription checks are the Phase 2
> upgrade (see the technical SPEC).

## How the 7-day trial is tracked (no sign-up)

When someone taps "Start my free week", the browser saves the start date in
`localStorage` (`gf_trial_start`). Every visit, the app checks that date and
computes days left. After 7 days the app locks to the paywall on that device.

**Honest limit:** because there is no sign-up, this lives on the device. If a
user clears their browser data, opens a private window, or switches phones,
they can start a fresh week. Most ordinary users never do this, so it is a
fine MVP tradeoff. To make the trial impossible to bypass you need identity
(the lightest version is one email field at trial start) plus a small backend
that records the trial per person. That is the Phase 2 upgrade.

## How you see people using it (no sign-up)

The site sends anonymous **usage events** to Vercel Analytics (see
`lib/analytics.ts`): `trial_started`, `food_checked`, `meal_built`,
`paywall_hit`, `access_unlocked`. Open your Vercel project's Analytics tab to
see how many trials started, how many foods were checked, and how many people
hit the paywall during the free week. It counts actions, not names.

## Nestuge checklist (one-time setup)

1. Create the Glufloat product on Nestuge as a N1,500 / month subscription
   (the free week is handled by the site itself, before checkout).
2. In the product's post-purchase delivery message, tell the buyer exactly
   how to get in. Use wording like:

   > Thank you for joining Glufloat. To open the app, go to
   > https://glufloat.vercel.app/unlock and enter this code: GLU-GREEN-2026
   > (or just tap this link, which opens it for you:
   > https://glufloat.vercel.app/unlock?code=GLU-GREEN-2026 )

3. That is it. Trial CTAs point to /trial; subscribe CTAs point to
   nestuge.com/glufloat.

The code is the same for everyone in this MVP (it is a shared unlock, not a
per-person key). When you want to retire or rotate it, edit `ACCESS_CODES`
in `lib/access.ts`, redeploy, and update the Nestuge message.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
node scripts/qa.mjs        # Playwright end-to-end QA (needs dev server running)
npx tsx scripts/engine-test.ts   # verdict engine sanity tests
```

## Key files

- `data/foods.json` — the 143-food seed database (62 green / 54 yellow / 27 red)
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
