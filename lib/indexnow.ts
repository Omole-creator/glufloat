import { SITE_URL } from "./site";

/**
 * IndexNow: tell Bing (and the other engines that share it) the moment a blog
 * post is published or changed, instead of waiting weeks for a crawl.
 *
 * This matters beyond Bing itself: ChatGPT's web search leans heavily on
 * Bing's index, so a post Bing has not seen is a post ChatGPT cannot find.
 *
 * The key is public by design. IndexNow proves the site owns it by fetching
 * https://www.glufloat.com/<key>.txt, which is `public/<key>.txt`. If the key
 * ever changes, rename that file to match.
 */
export const INDEXNOW_KEY = "cb3e2c98329eab31037ed4287272a312";

/** Fire and forget: a failed ping must never fail a publish. */
export async function pingIndexNow(paths: string[]): Promise<void> {
  // Only the live site. A local build or a preview must not announce URLs.
  if (process.env.VERCEL_ENV !== "production") return;
  const host = new URL(SITE_URL).host;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: paths.map((p) => `${SITE_URL}${p}`),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* the engines will still find the post through the sitemap */
  }
}
