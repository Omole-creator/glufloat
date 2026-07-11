import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPublishedPosts, longDate } from "@/lib/blog";
import { readingMinutes } from "@/lib/markdown";
import { abs, SITE_NAME } from "@/lib/site";

// Rebuilt on publish (revalidatePath), and re-checked hourly as a safety net in
// case a revalidate call is ever lost.
export const revalidate = 3600;

const TITLE = "The Glufloat blog | Your diabetes health deserves the best";
const DESCRIPTION =
  "Research-backed advice and practical tips designed to keep your diabetes under control. Nigerian food, explained simply.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: abs("/blog") },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: abs("/blog"),
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function BlogIndex() {
  const posts = await getPublishedPosts();

  // Tells Google this is a list of articles, and in what order.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: TITLE,
    description: DESCRIPTION,
    url: abs("/blog"),
    publisher: { "@type": "Organization", name: SITE_NAME, url: abs("/") },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      url: abs(`/blog/${p.slug}`),
      datePublished: p.published_at,
      dateModified: p.updated_at,
      author: { "@type": "Person", name: p.author },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1 bg-mist">
        {/* pt clears the fixed 64px Navbar. */}
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-28 sm:pt-32">
          <p className="font-display text-sm font-bold uppercase tracking-widest text-brand">
            The Glufloat blog
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Your diabetes health deserves the best.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Our blog shares research-backed advice and practical tips designed to
            keep your diabetes under control.
          </p>

          {posts.length === 0 ? (
            <p className="mt-16 rounded-2xl border border-line bg-white p-8 text-center text-ink-soft">
              No posts yet. Check back soon.
            </p>
          ) : (
            <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <article
                  key={p.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-lg"
                >
                  <Link href={`/blog/${p.slug}`} className="flex h-full flex-col">
                    {p.cover_url ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-mist">
                        <Image
                          src={p.cover_url}
                          alt={p.cover_alt ?? ""}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] w-full bg-gradient-to-br from-brand/15 to-green/15" />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-xl font-bold leading-snug text-ink">
                        {p.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 flex-1 text-ink-soft">{p.excerpt}</p>
                      <p className="mt-4 text-sm text-ink-soft/70">
                        {longDate(p.published_at)} &middot; {readingMinutes(p.body_md)} min read
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
