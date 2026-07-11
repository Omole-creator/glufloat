import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";
import { abs } from "@/lib/site";

// Re-generated on publish (revalidatePath("/sitemap.xml")), with an hourly
// safety net.
export const revalidate = 3600;

/**
 * The sitemap Google reads. Every published post is in it automatically, so
 * there is nothing to remember to update when a post goes live.
 *
 * Deliberately absent: /app, /signin, /signup, /trial, /unlock, /admin. They are
 * either behind an account or private, so listing them only invites Google to
 * crawl pages it can never index. robots.ts blocks them too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();

  const pages: MetadataRoute.Sitemap = [
    { url: abs("/"), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: abs("/blog"), lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: abs("/about"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/disclaimer"), changeFrequency: "yearly", priority: 0.2 },
    { url: abs("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: abs("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const articles: MetadataRoute.Sitemap = posts.map((p) => ({
    url: abs(`/blog/${p.slug}`),
    lastModified: new Date(p.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.8,
    ...(p.cover_url ? { images: [p.cover_url] } : {}),
  }));

  return [...pages, ...articles];
}
