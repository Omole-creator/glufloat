import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";

/**
 * What crawlers may read.
 *
 * The blog and the marketing pages are open, because they are the only pages a
 * stranger is meant to find. Everything behind the account, plus the admin
 * screen and the API, is closed: Google can never index them anyway, and letting
 * it try wastes the crawl budget that should be going to posts.
 *
 * Note this blocks CRAWLING, not access. It is not a security control. The admin
 * screen is protected by its password, and drafts by RLS.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/app", "/unlock", "/signin", "/signup", "/trial"],
    },
    sitemap: abs("/sitemap.xml"),
    host: abs("/"),
  };
}
