import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogTracker, { CtaTracker } from "@/components/BlogTracker";
import PostToc from "@/components/PostToc";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import { getPostBySlug, getPublishedPosts, longDate, relatedTo } from "@/lib/blog";
import { extractHeadings, readingMinutes, renderMarkdown } from "@/lib/markdown";
import { abs, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

/**
 * Pre-build every published post at deploy time. This is what puts the article
 * text into the HTML Google is served, instead of an empty shell that fills in
 * from the client. Everything else here is decoration next to this.
 */
export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const url = abs(`/blog/${post.slug}`);
  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: post.excerpt,
    // The canonical tag. Without it, /blog/x and /blog/x?utm_source=whatsapp
    // look like two different pages competing with each other.
    alternates: { canonical: url },
    authors: [{ name: post.author }],
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author],
      tags: post.tags,
      images: post.cover_url ? [{ url: post.cover_url, alt: post.cover_alt ?? post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const all = await getPublishedPosts();
  const related = relatedTo(post, all);
  const url = abs(`/blog/${post.slug}`);
  const html = renderMarkdown(post.body_md);
  const headings = extractHeadings(post.body_md);
  const minutes = readingMinutes(post.body_md);
  const initial = post.author.trim().charAt(0).toUpperCase() || "G";

  /**
   * BlogPosting structured data. `reviewedBy` is only included when a reviewer
   * exists: claiming a medical review that never happened would be worse than
   * having none, both for the reader and for Google.
   */
  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: abs("/"),
      logo: { "@type": "ImageObject", url: abs("/icon.png") },
    },
    inLanguage: "en-NG",
    keywords: post.tags.join(", "),
    wordCount: post.body_md.split(/\s+/).filter(Boolean).length,
    ...(post.cover_url ? { image: [post.cover_url] } : {}),
  };
  if (post.reviewed_by) {
    article.reviewedBy = { "@type": "Person", name: post.reviewed_by };
    if (post.reviewed_at) article.lastReviewed = post.reviewed_at;
  }

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
      { "@type": "ListItem", position: 2, name: "Blog", item: abs("/blog") },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Navbar />
      <ReadingProgress targetId="post-body" />

      <main className="flex-1 bg-white">
        {/* ---- the headline block. pt clears the fixed 64px Navbar. ---- */}
        <header className="relative overflow-hidden bg-gradient-to-b from-mist via-mist/50 to-white pb-10 pt-28 sm:pt-32">
          <div
            className="dots pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-24 top-4 h-72 w-72 rounded-full bg-leaf-bright/10 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-3xl px-5">
            {/* Visible breadcrumb, matching the structured data above. */}
            <nav aria-label="Breadcrumb" className="text-sm text-ink-soft/70">
              <Link href="/" className="hover:text-brand">
                Home
              </Link>
              <span className="px-2">/</span>
              <Link href="/blog" className="hover:text-brand">
                Blog
              </Link>
            </nav>

            {/* Same face, weight and tracking as the hero headline on the landing page. */}
            <h1 className="mt-5 font-display text-[2.1rem] font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl">
              {post.title}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-ink-soft sm:text-xl">
              {post.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-ink-soft">
              <span className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-leaf font-display text-sm font-bold text-white">
                  {initial}
                </span>
                <span className="font-semibold text-ink">{post.author}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-ink-soft/60" />
                <time dateTime={post.published_at ?? undefined}>
                  {longDate(post.published_at)}
                </time>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-ink-soft/60" />
                {minutes} min read
              </span>
            </div>

            {/*
              The reviewer line. It renders only when a reviewer is set, so a post
              can go live before anyone has checked it, and it simply stays quiet.
              When it IS set, it is the strongest trust signal on the page.
            */}
            {post.reviewed_by && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-mint px-4 py-1.5 text-sm font-semibold text-ink">
                <span aria-hidden className="text-leaf-deep">&#10003;</span>
                Checked by {post.reviewed_by}
                {post.reviewed_at && (
                  <span className="font-normal text-ink-soft">
                    on {longDate(post.reviewed_at)}
                  </span>
                )}
              </p>
            )}

            <div className="mt-7 border-t border-line pt-5">
              <ShareButtons url={url} title={post.title} size="sm" />
            </div>
          </div>
        </header>

        {post.cover_url && (
          <div className="mx-auto max-w-5xl px-5">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-mist shadow-[0_30px_60px_-30px_rgba(12,42,71,0.45)] ring-1 ring-line">
              <Image
                src={post.cover_url}
                alt={post.cover_alt ?? post.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* ---- the article, with the contents list beside it on a big screen ---- */}
        <div className="mx-auto grid max-w-6xl justify-center gap-10 px-5 pb-20 pt-8 lg:grid-cols-[minmax(0,44rem)_15rem] lg:gap-14">
          <article id="post-body">
            <div dangerouslySetInnerHTML={{ __html: html }} />

            {post.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-mist px-3 py-1 text-sm text-ink-soft"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Share again at the end, where somebody who found it useful is. */}
            <div className="mt-10 rounded-2xl border border-line bg-mist/60 p-5">
              <p className="font-display text-base font-bold text-ink">
                Know someone who needs this?
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Send it to them. It is free to read.
              </p>
              <div className="mt-4">
                <ShareButtons url={url} title={post.title} />
              </div>
            </div>

            {/*
              No disclaimer box here: the same words sit in the footer of every
              page, this one included. Saying it twice on one screen only teaches
              people to skip it.
            */}

            {/*
              The read-to-the-end marker sits here, just before the call to action.
              So "read" on the admin screen means they genuinely got to the bottom,
              not that they bounced off the headline.
            */}
            <BlogTracker slug={post.slug} />

            {/* The funnel. The blog is public; the product is not. */}
            <div className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-7 text-white shadow-[0_24px_50px_-24px_rgba(27,95,170,0.8)] sm:p-9">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-leaf-bright/25 blur-3xl"
                aria-hidden
              />
              <div className="relative">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Check your food before you eat it.
                </h2>
                <p className="mt-3 max-w-xl text-white/85">
                  Search from 1,400+ Nigerian foods and meals to instantly see
                  whether it&apos;s green, yellow, or red for your diabetes and
                  discover simple changes that can turn it into a better choice.
                </p>
                <CtaTracker slug={post.slug}>
                  <Link
                    href="/trial"
                    className="group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-display font-bold text-brand transition-transform hover:scale-105"
                  >
                    Start my 3-day free trial
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </CtaTracker>
                <p className="mt-4 text-sm text-white/80">
                  Free for 3 days. No card required.
                </p>
              </div>
            </div>

            {related.length > 0 && (
              <section className="mt-14">
                <h2 className="font-display text-2xl font-bold text-ink">
                  Read next
                </h2>
                <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/blog/${r.slug}`}
                        className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg"
                      >
                        <span className="font-display font-bold leading-snug text-ink group-hover:text-brand">
                          {r.title}
                        </span>
                        <span className="mt-2 line-clamp-2 flex-1 text-sm text-ink-soft">
                          {r.excerpt}
                        </span>
                        <span className="mt-3 text-xs font-semibold text-ink-soft/70">
                          {readingMinutes(r.body_md)} min read
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          {headings.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <PostToc headings={headings} />
              </div>
            </aside>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
