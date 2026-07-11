import { getPublishedPosts } from "@/lib/blog";
import { abs, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

/** XML has five characters that must never appear raw inside a tag. */
function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * An RSS feed at /blog/rss.xml.
 *
 * Worth having for two reasons beyond readers: news aggregators and syndication
 * services discover posts from it, and those pick-ups become the external links
 * that no amount of on-page work can manufacture.
 */
export async function GET() {
  const posts = await getPublishedPosts();
  const now = new Date().toUTCString();

  const items = posts
    .map(
      (p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${abs(`/blog/${p.slug}`)}</link>
      <guid isPermaLink="true">${abs(`/blog/${p.slug}`)}</guid>
      <description>${xml(p.excerpt)}</description>
      <pubDate>${new Date(p.published_at ?? p.created_at).toUTCString()}</pubDate>
      <author>${xml(p.author)}</author>
    </item>`,
    )
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(SITE_NAME)} blog</title>
    <link>${abs("/blog")}</link>
    <description>${xml(SITE_DESCRIPTION)}</description>
    <language>en-NG</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${abs("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
