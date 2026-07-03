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

## Nestuge checklist (one-time setup)

1. Create the Glufloat product on Nestuge as a N1,500 / month subscription
   (the free week is handled by the site itself, before checkout).
2. In the post-purchase delivery, paste the unlock link above.
3. That is it. Trial CTAs point to /trial; subscribe CTAs point to
   nestuge.com/glufloat.

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

- Fill every `[BRACKETED]` placeholder in /terms, /privacy, /disclaimer and
  have a Nigerian tech/health-law solicitor review them.
- Register the company with CAC before taking money.
