import Script from "next/script";

/**
 * Google Tag Manager container. Rendered once in the root layout, so it is on
 * every page and never twice on one.
 *
 * The container ID is public by design (it ships in the HTML of every page),
 * so it is written here rather than hidden behind an env var.
 *
 * PRODUCTION ONLY, same gate and same reasoning as GoogleAnalytics.tsx: Vercel
 * builds preview deploys in production mode too, so NODE_ENV would let the tag
 * through on every preview, and scripts/qa.mjs drives the whole site 14 times
 * per run.
 *
 * WARNING: GA4 (G-JN5PD0B50Z) is already on the page as its own gtag.js tag
 * from GoogleAnalytics.tsx. Do NOT also add a GA4 Configuration tag for that
 * same ID inside this container, or every page view is counted twice and the
 * traffic numbers are silently doubled. GA4 lives in ONE place: either the
 * direct tag or the container, never both.
 */
const GTM_ID = "GTM-N4W2D2W4";

const enabled = () => process.env.VERCEL_ENV === "production";

export default function GoogleTagManager() {
  if (!enabled()) return null;

  // An inline Script MUST carry an id or Next.js will not track it.
  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

/**
 * The no-JavaScript fallback, which Google requires to sit immediately after
 * the opening <body> tag. It is plain markup, not a next/script, so it is in
 * the server-rendered HTML rather than injected after hydration. Written with
 * dangerouslySetInnerHTML so the iframe reaches the page as the exact markup
 * Google gave us.
 */
export function GoogleTagManagerNoScript() {
  if (!enabled()) return null;

  return (
    <noscript
      dangerouslySetInnerHTML={{
        __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
      }}
    />
  );
}
