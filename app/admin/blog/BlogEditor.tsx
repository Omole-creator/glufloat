"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/blog";
import { slugify } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";

/** A blank post. The reviewer is empty, and a post publishes fine that way. */
const BLANK = {
  id: undefined as string | undefined,
  slug: "",
  title: "",
  excerpt: "",
  body_md: "",
  cover_url: "" as string | null,
  cover_alt: "",
  author: "The Glufloat team",
  reviewed_by: "",
  tags: "",
  status: "draft" as "draft" | "published",
};

type Draft = typeof BLANK;

function toDraft(p: Post): Draft {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body_md: p.body_md,
    cover_url: p.cover_url,
    cover_alt: p.cover_alt ?? "",
    author: p.author,
    reviewed_by: p.reviewed_by ?? "",
    tags: p.tags.join(", "),
    status: p.status,
  };
}

const label = "block font-display text-sm font-bold text-ink";
const input =
  "mt-1.5 w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-ink outline-none transition-colors focus:border-brand";

export default function BlogEditor({ initial }: { initial: Post[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initial);
  const [d, setD] = useState<Draft>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  // The address is derived from the title until the writer types their own, so
  // they never have to think about it, but can still fix it if they want to.
  const onTitle = (title: string) => {
    setD((prev) => ({
      ...prev,
      title,
      slug: !prev.id && (!prev.slug || prev.slug === slugify(prev.title))
        ? slugify(title)
        : prev.slug,
    }));
  };

  async function refresh() {
    const res = await fetch("/api/admin/posts");
    if (res.ok) setPosts((await res.json()).posts);
  }

  async function save(status: "draft" | "published") {
    setBusy(true);
    setError("");
    setNote("");
    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...d,
        status,
        cover_url: d.cover_url || null,
        // Blank means nobody has checked it. Send null, never "".
        reviewed_by: d.reviewed_by.trim() || null,
        tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Something went wrong. Try again.");
      return;
    }
    setD(toDraft(json.post));
    setNote(
      status === "published"
        ? "Published. It is live on the site now."
        : "Saved as a draft. Nobody can see it yet.",
    );
    await refresh();
    router.refresh();
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "The picture did not upload.");
      return;
    }
    set("cover_url", json.url);
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (d.id === id) setD(BLANK);
    await refresh();
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      {/* ---- the editor ---- */}
      <section className="rounded-2xl border border-line bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">
            {d.id ? "Edit post" : "New post"}
          </h2>
          {d.id && (
            <button
              onClick={() => setD(BLANK)}
              className="text-sm text-ink-soft underline hover:text-brand"
            >
              Start a new one
            </button>
          )}
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label className={label} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className={input}
              value={d.title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="Is eba bad for diabetes?"
            />
          </div>

          <div>
            <label className={label} htmlFor="slug">
              Web address
            </label>
            <input
              id="slug"
              className={input}
              value={d.slug}
              onChange={(e) => set("slug", slugify(e.target.value))}
              placeholder="is-eba-bad-for-diabetes"
            />
            <p className="mt-1 text-xs text-ink-soft">
              glufloat.com/blog/{d.slug || "your-post"}
            </p>
          </div>

          <div>
            <label className={label} htmlFor="excerpt">
              Short summary
            </label>
            <textarea
              id="excerpt"
              rows={2}
              className={input}
              value={d.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              placeholder="One or two plain sentences. This is what shows on Google."
            />
            <p className="mt-1 text-xs text-ink-soft">
              {d.excerpt.length} letters. Google shows about 155, so keep it short.
            </p>
          </div>

          <div>
            <label className={label}>Cover picture</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="mt-1.5 w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:font-display file:font-bold file:text-white"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
            {d.cover_url && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.cover_url}
                  alt=""
                  className="h-36 w-full rounded-xl object-cover"
                />
                <input
                  className={input}
                  value={d.cover_alt}
                  onChange={(e) => set("cover_alt", e.target.value)}
                  placeholder="Say what is in the picture. Blind readers and Google both use this."
                />
                <button
                  onClick={() => set("cover_url", "")}
                  className="mt-2 text-sm text-v-red underline"
                >
                  Remove picture
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="author">
                Written by
              </label>
              <input
                id="author"
                className={input}
                value={d.author}
                onChange={(e) => set("author", e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="reviewer">
                Checked by{" "}
                <span className="font-normal text-ink-soft">
                  (leave empty if nobody has)
                </span>
              </label>
              <input
                id="reviewer"
                className={input}
                value={d.reviewed_by}
                onChange={(e) => set("reviewed_by", e.target.value)}
                placeholder="e.g. Dr Ada Okoye, Dietitian"
              />
              <p className="mt-1 text-xs text-ink-soft">
                You can still publish without this. When you fill it in, a green
                &ldquo;Checked by&rdquo; badge shows on the post, and Google is
                told a real person reviewed it.
              </p>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              className={input}
              value={d.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="swallow, eba, portion size"
            />
            <p className="mt-1 text-xs text-ink-soft">Separate them with commas.</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className={label} htmlFor="body">
                The post
              </label>
              <button
                onClick={() => setPreview((p) => !p)}
                className="text-sm text-brand underline"
              >
                {preview ? "Back to writing" : "See how it will look"}
              </button>
            </div>

            {preview ? (
              <div
                className="mt-2 min-h-[24rem] rounded-xl border-2 border-line bg-white p-5"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(d.body_md) }}
              />
            ) : (
              <textarea
                id="body"
                rows={20}
                className={`${input} font-mono text-sm`}
                value={d.body_md}
                onChange={(e) => set("body_md", e.target.value)}
                placeholder={"## A heading\n\nWrite normally here.\n\n- A bullet point\n- Another one\n\n**Bold words** look like this.\n\n[A link to the eba card](/app)"}
              />
            )}
            <p className="mt-1 text-xs text-ink-soft">
              Use ## for a heading, - for a bullet, **word** for bold, and
              [words](/link) for a link.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-v-red/10 px-4 py-3 text-sm font-semibold text-v-red">
              {error}
            </p>
          )}
          {note && (
            <p className="rounded-xl bg-v-green/10 px-4 py-3 text-sm font-semibold text-ink">
              {note}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              disabled={busy}
              onClick={() => save("published")}
              className="rounded-full bg-brand px-7 py-3 font-display font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
            >
              {busy ? "Working..." : "Publish"}
            </button>
            <button
              disabled={busy}
              onClick={() => save("draft")}
              className="rounded-full border-2 border-line bg-white px-7 py-3 font-display font-bold text-ink hover:border-brand disabled:opacity-50"
            >
              Save as draft
            </button>
            {d.id && d.status === "published" && (
              <a
                href={`/blog/${d.slug}`}
                target="_blank"
                rel="noreferrer"
                className="self-center text-sm text-brand underline"
              >
                See it live
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ---- the list ---- */}
      <aside className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold text-ink">
          All posts ({posts.length})
        </h2>
        {posts.length === 0 && (
          <p className="mt-3 text-sm text-ink-soft">Nothing written yet.</p>
        )}
        <ul className="mt-4 space-y-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className={`rounded-xl border p-3 ${d.id === p.id ? "border-brand bg-mist" : "border-line"}`}
            >
              <button
                onClick={() => {
                  setD(toDraft(p));
                  setPreview(false);
                  setNote("");
                  setError("");
                }}
                className="block w-full text-left"
              >
                <span className="font-display font-bold text-ink">{p.title}</span>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                    p.status === "published"
                      ? "bg-v-green/15 text-ink"
                      : "bg-v-yellow/20 text-ink"
                  }`}
                >
                  {p.status === "published" ? "Live" : "Draft"}
                </span>
                {p.reviewed_by && (
                  <span className="ml-1 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-xs text-ink">
                    Checked
                  </span>
                )}
              </button>
              <button
                onClick={() => remove(p.id, p.title)}
                className="mt-2 text-xs text-v-red underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
