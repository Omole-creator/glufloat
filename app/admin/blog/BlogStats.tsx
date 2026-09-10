import type { Post } from "@/lib/blog";
import { getBlogStats, rate } from "@/lib/blogStats";
import AdminHero from "../AdminHero";

/**
 * The blog scoreboard. Read left to right, it is the funnel: how many opened the
 * post, how many read it to the end, how many clicked the trial button, how many
 * made an account, and how many are paying today.
 *
 * "Paying" is the number that decides whether a post was worth writing, and it
 * is the one a page-view counter can never tell you.
 */
export default async function BlogStats({ posts }: { posts: Post[] }) {
  const { byPost, totals, signupsNotFromBlog } = await getBlogStats();

  const published = posts.filter((p) => p.status === "published");
  const rows = published
    .map((p) => ({ post: p, s: byPost.get(p.slug) }))
    .sort((a, b) => (b.s?.opened ?? 0) - (a.s?.opened ?? 0));

  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink/50";
  const td = "px-3 py-3 text-sm text-ink";

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-ink">How the blog is doing</h2>

      <div className="mt-4">
        <AdminHero
          items={[
            { label: "People who opened a post", value: totals.opened.toLocaleString() },
            { label: "Read to the end", value: totals.read.toLocaleString(), sub: `${rate(totals.read, totals.opened)} of readers` },
            { label: "Signed up from the blog", value: totals.signedUp.toLocaleString(), sub: `${rate(totals.signedUp, totals.opened)} of readers` },
            { label: "Paying, from the blog", value: totals.paid.toLocaleString(), sub: `${rate(totals.paid, totals.signedUp)} of sign-ups` },
          ]}
        />
      </div>

      {published.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-center text-ink-soft shadow-[0_6px_28px_-14px_rgba(12,42,71,0.18)] ring-1 ring-ink/[0.05]">
          Nothing published yet, so there is nothing to measure.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-[0_6px_28px_-14px_rgba(12,42,71,0.18)] ring-1 ring-ink/[0.05]">
          <table className="w-full min-w-[52rem]">
            <thead className="border-b border-line bg-mist">
              <tr>
                <th className={th}>Post</th>
                <th className={th}>Opened</th>
                <th className={th}>Read to end</th>
                <th className={th}>Clicked trial</th>
                <th className={th}>Signed up</th>
                <th className={th}>Started trial</th>
                <th className={th}>Paying</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ post, s }) => {
                const v = s ?? {
                  opened: 0, read: 0, clicked: 0, signedUp: 0, trials: 0, paid: 0,
                };
                return (
                  <tr key={post.id} className="border-b border-line last:border-0">
                    <td className={`${td} font-display font-bold`}>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-brand"
                      >
                        {post.title}
                      </a>
                    </td>
                    <td className={td}>{v.opened.toLocaleString()}</td>
                    <td className={td}>
                      {v.read.toLocaleString()}
                      <span className="ml-1 text-xs text-ink-soft">
                        {rate(v.read, v.opened)}
                      </span>
                    </td>
                    <td className={td}>
                      {v.clicked.toLocaleString()}
                      <span className="ml-1 text-xs text-ink-soft">
                        {rate(v.clicked, v.opened)}
                      </span>
                    </td>
                    <td className={td}>
                      {v.signedUp.toLocaleString()}
                      <span className="ml-1 text-xs text-ink-soft">
                        {rate(v.signedUp, v.opened)}
                      </span>
                    </td>
                    <td className={td}>{v.trials.toLocaleString()}</td>
                    <td className={`${td} font-display font-bold text-leaf`}>
                      {v.paid.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-soft">
        {signupsNotFromBlog.toLocaleString()} sign-up
        {signupsNotFromBlog === 1 ? "" : "s"} came from somewhere other than a blog
        post.
      </p>
    </section>
  );
}
