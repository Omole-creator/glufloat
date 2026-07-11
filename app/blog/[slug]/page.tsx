import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPostBySlug, getPublishedPosts, longDate, relatedTo } from "@/lib/blog";
import { readingMinutes, renderMarkdown } from "@/lib/markdown";
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
      <main className="flex-1 bg-white">
        {/* pt clears the fixed 64px Navbar. */}
        <article className="mx-auto max-w-3xl px-5 pb-20 pt-28 sm:pt-32">
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

          <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            {post.title}
          </h1>

          <p className="mt-5 text-xl leading-relaxed text-ink-soft">{post.excerpt}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft/80">
            <span>By {post.author}</span>
            <span aria-hidden>&middot;</span>
            <time dateTime={post.published_at ?? undefined}>
              {longDate(post.published_at)}
            </time>
            <span aria-hidden>&middot;</span>
            <span>{readingMinutes(post.body_md)} min read</span>
          </div>

          {/*
            The reviewer line. It renders only when a reviewer is set, so a post
            can go live before anyone has checked it, and it simply stays quiet.
            When it IS set, it is the strongest trust signal on the page.
          */}
          {post.reviewed_by && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/10 px-4 py-1.5 text-sm font-semibold text-ink">
              <span aria-hidden>&#10003;</span>
              Checked by {post.reviewed_by}
              {post.reviewed_at && <span className="font-normal text-ink-soft">on {longDate(post.reviewed_at)}</span>}
            </p>
          )}

          {post.cover_url && (
            <div className="relative mt-9 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-mist">
              <Image
                src={post.cover_url}
                alt={post.cover_alt ?? post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}

          <div
            className="mt-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />

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

          {/* Every health page carries the same disclaimer the rest of the site does. */}
          <p className="mt-10 rounded-2xl border border-line bg-mist p-5 text-sm text-ink-soft">
            Glufloat gives general food information for people living with diabetes.
            It is not medical advice, and it does not diagnose, treat, or cure any
            condition. Always talk to your doctor about your own care. Read the{" "}
            <Link href="/disclaimer" className="text-brand underline underline-offset-2">
              full disclaimer
            </Link>
            .
          </p>

          {/* The funnel. The blog is public; the product is not. */}
          <div className="mt-10 rounded-2xl bg-brand p-7 text-white sm:p-9">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Check your own food before you eat it.
            </h2>
            <p className="mt-2 text-white/85">
              Green, yellow, or red on 1,400+ Nigerian foods, and the fix that
              turns your meal green. Free for 3 days. No card.
            </p>
            <Link
              href="/trial"
              className="mt-5 inline-block rounded-full bg-white px-7 py-3 font-display font-bold text-brand transition-transform hover:scale-105"
            >
              Start my 3-day free trial
            </Link>
          </div>

          {related.length > 0 && (
            <section className="mt-14">
              <h2 className="font-display text-2xl font-bold text-ink">Read next</h2>
              <ul className="mt-5 space-y-3">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/blog/${r.slug}`}
                      className="block rounded-xl border border-line p-4 transition-colors hover:border-brand hover:bg-mist"
                    >
                      <span className="font-display font-bold text-ink">{r.title}</span>
                      <span className="mt-1 block text-sm text-ink-soft">{r.excerpt}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
