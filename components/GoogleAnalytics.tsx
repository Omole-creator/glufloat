import Script from "next/script";

/**
 * Google Analytics 4 (the gtag.js Google tag). Rendered once in the root
 * layout, so it is on every page and never twice on one.
 *
 * The measurement ID is public by design (it ships in the HTML of every page),
 * so it is written here rather than hidden behind an env var.
 *
 * PRODUCTION ONLY. `npm run dev`, a local `npm start`, and every Vercel preview
 * deploy return null and send nothing. `scripts/qa.mjs` drives the whole site
 * 14 times per run and the screenshot helpers open real pages; without this
 * gate those runs would land in the same property as real users.
 *
 * VERCEL_ENV, not NODE_ENV: Vercel builds preview deploys in production mode
 * too, so NODE_ENV would let the tag through on every preview.
 */
const GA_ID = "G-JN5PD0B50Z";

export default function GoogleAnalytics() {
  if (process.env.VERCEL_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      {/* An inline Script MUST carry an id or Next.js will not track it. */}
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
