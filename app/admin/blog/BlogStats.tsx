import type { Post } from "@/lib/blog";
import { getBlogStats, rate } from "@/lib/blogStats";

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

  const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );

  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink/50";
  const td = "px-3 py-3 text-sm text-ink";

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-ink">How the blog is doing</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Every number below is a real person, counted once. Nobody&apos;s name,
        email, or location is stored to make this.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="People who opened a post"
          value={totals.opened.toLocaleString()}
          sub={`${totals.views.toLocaleString()} opens in total`}
        />
        <Tile
          label="Read to the end"
          value={totals.read.toLocaleString()}
          sub={`${rate(totals.read, totals.opened)} of readers finished`}
        />
        <Tile
          label="Signed up from the blog"
          value={totals.signedUp.toLocaleString()}
          sub={`${rate(totals.signedUp, totals.opened)} of readers made an account`}
        />
        <Tile
          label="Paying, from the blog"
          value={totals.paid.toLocaleString()}
          sub={`${rate(totals.paid, totals.signedUp)} of blog sign-ups now pay`}
        />
      </div>

      {published.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-white p-6 text-center text-ink-soft">
          Nothing published yet, so there is nothing to measure.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
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
                  opened: 0, views: 0, read: 0, clicked: 0, signedUp: 0, trials: 0, paid: 0,
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
                    <td className={td}>
                      {v.opened.toLocaleString()}
                      <span className="ml-1 text-xs text-ink-soft">
                        ({v.views.toLocaleString()} opens)
                      </span>
                    </td>
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
        post. A reader is credited to the <strong>first</strong> post they ever
        landed on, even if they read others before signing up.
      </p>

      {/* How to read it, in one line each. */}
      <details className="mt-4 rounded-2xl border border-line bg-white p-5">
        <summary className="cursor-pointer font-display font-bold text-ink">
          What each number is telling you
        </summary>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">Many opened, few read to the end.</strong>{" "}
            The headline is working but the post is not. Make it shorter or get to
            the answer faster.
          </li>
          <li>
            <strong className="text-ink">Many read, few clicked the trial.</strong>{" "}
            The post is good but it is not making anyone want the app. Give the
            knowledge, keep the exact numbers inside the app.
          </li>
          <li>
            <strong className="text-ink">Many clicked, few signed up.</strong> The
            post did its job. The sign-up page is losing them.
          </li>
          <li>
            <strong className="text-ink">Few opened at all.</strong> Nobody is
            searching for this, or Google has not ranked it yet. New posts take
            weeks, so give it time before judging it.
          </li>
        </ul>
      </details>
    </section>
  );
}
