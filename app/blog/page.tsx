import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPublishedPosts, longDate, type Post } from "@/lib/blog";
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

/** The green "Checked by" badge, on any post a dietitian has really read. */
function CheckedBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-mint px-2.5 py-1 text-xs font-bold text-ink">
      <span aria-hidden className="text-leaf-deep">&#10003;</span>
      Checked by {name}
    </span>
  );
}

function Meta({ post }: { post: Post }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft/70">
      <time dateTime={post.published_at ?? undefined}>
        {longDate(post.published_at)}
      </time>
      <span aria-hidden>&middot;</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {readingMinutes(post.body_md)} min read
      </span>
    </p>
  );
}

export default async function BlogIndex() {
  const posts = await getPublishedPosts();
  const [featured, ...rest] = posts;

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
      <main className="flex-1 bg-white">
        {/* ---- the band at the top. pt clears the fixed 64px Navbar. ---- */}
        <section className="relative overflow-hidden bg-gradient-to-b from-mist via-mist/60 to-white pb-14 pt-28 sm:pt-32">
          <div
            className="dots pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-bright/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-leaf-bright/15 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-5xl px-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-brand backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-leaf-bright" />
              The Glufloat blog
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl">
              Your diabetes health{" "}
              <span className="text-brand">deserves the best.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Our blog shares research-backed advice and practical tips designed
              to keep your diabetes under control.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-20">
          {posts.length === 0 ? (
            <p className="rounded-3xl border border-line bg-mist p-10 text-center text-ink-soft">
              No posts yet. Check back soon.
            </p>
          ) : (
            <>
              {/* ---- the newest post, given the room it deserves ---- */}
              <Link
                href={`/blog/${featured.slug}`}
                className="group grid overflow-hidden rounded-3xl border border-line bg-white shadow-[0_20px_50px_-30px_rgba(12,42,71,0.4)] transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_30px_60px_-30px_rgba(12,42,71,0.5)] md:grid-cols-2"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-mist md:aspect-auto md:h-full md:min-h-[20rem]">
                  {featured.cover_url ? (
                    <Image
                      src={featured.cover_url}
                      alt={featured.cover_alt ?? ""}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 512px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-brand/15 to-leaf/15" />
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand backdrop-blur">
                    Newest
                  </span>
                </div>

                <div className="flex flex-col justify-center p-7 sm:p-9">
                  {featured.tags.length > 0 && (
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">
                      {featured.tags[0]}
                    </p>
                  )}
                  <h2 className="mt-3 font-display text-2xl font-bold leading-snug text-ink group-hover:text-brand sm:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-ink-soft">
                    {featured.excerpt}
                  </p>
                  {featured.reviewed_by && (
                    <p className="mt-4">
                      <CheckedBadge name={featured.reviewed_by} />
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <Meta post={featured} />
                    <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-brand">
                      Read it
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>

              {/* ---- everything else ---- */}
              {rest.length > 0 && (
                <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p) => (
                    <article key={p.id} className="h-full">
                      <Link
                        href={`/blog/${p.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_24px_50px_-30px_rgba(12,42,71,0.5)]"
                      >
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-mist">
                          {p.cover_url ? (
                            <Image
                              src={p.cover_url}
                              alt={p.cover_alt ?? ""}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-brand/15 to-leaf/15" />
                          )}
                          {p.tags.length > 0 && (
                            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand backdrop-blur">
                              {p.tags[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                          <h2 className="font-display text-xl font-bold leading-snug text-ink group-hover:text-brand">
                            {p.title}
                          </h2>
                          <p className="mt-2 line-clamp-3 flex-1 text-ink-soft">
                            {p.excerpt}
                          </p>
                          {p.reviewed_by && (
                            <p className="mt-4">
                              <CheckedBadge name={p.reviewed_by} />
                            </p>
                          )}
                          <div className="mt-4 border-t border-line pt-3">
                            <Meta post={p} />
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
