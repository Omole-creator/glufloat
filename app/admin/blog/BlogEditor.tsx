"use client";

import { useRef, useState } from "react";
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Where the writer last had the cursor.
   *
   * This must be remembered, not read off the textarea at the moment a button
   * is pressed. Opening a prompt() for a link, or the file picker for a
   * picture, takes the focus away first, and the textarea can come back
   * reporting a cursor at 0 - which is how a link or a picture ended up jumping
   * to the very top of the post instead of landing where it was put. Null means
   * the writer has not put the cursor anywhere yet, and then new text goes to
   * the end, never to the beginning.
   */
  const selRef = useRef<[number, number] | null>(null);
  const remember = (ta: HTMLTextAreaElement) => {
    selRef.current = [ta.selectionStart, ta.selectionEnd];
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  /** Load a post (or a blank one) into the editor, cursor forgotten with it. */
  const load = (draft: Draft) => {
    selRef.current = null;
    setD(draft);
  };

  /* ---- the toolbar -------------------------------------------------------
   * Nobody should have to remember what ## or [](). means. These buttons type
   * the formatting for the writer, around whatever they have selected, and put
   * the cursor back where it belongs. The post is still stored as plain text,
   * which is what keeps it fast to render and safe to escape.
   */

  /** Replace the selected text, then re-focus and re-select the useful part. */
  function apply(
    fn: (selected: string, start: number) => { text: string; select?: [number, number] },
  ) {
    const body = d.body_md;
    const [start, end] = selRef.current ?? [body.length, body.length];
    const selected = body.slice(start, end);
    const { text, select } = fn(selected, start);
    const next = body.slice(0, start) + text + body.slice(end);
    set("body_md", next);

    const [a, b] = select ?? [text.length, text.length];
    selRef.current = [start + a, start + b];
    requestAnimationFrame(() => {
      const ta = bodyRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(start + a, start + b);
    });
  }

  /** **bold**, *italic*: wrap the selection, or drop in a placeholder word. */
  const wrap = (mark: string, placeholder: string) =>
    apply((sel) => {
      const word = sel || placeholder;
      return {
        text: `${mark}${word}${mark}`,
        select: [mark.length, mark.length + word.length],
      };
    });

  /**
   * Headings, bullets, numbers, quotes: put a marker at the start of the line.
   * `mark` gets the line's position, so a numbered list counts 1, 2, 3, 4
   * instead of writing "1." four times.
   */
  const linePrefix = (
    mark: string | ((i: number) => string),
    placeholder: string,
  ) =>
    apply((sel, start) => {
      const at = (i: number) => (typeof mark === "string" ? mark : mark(i));
      const lines = (sel || placeholder).split("\n");
      const text = lines.map((l, i) => `${at(i)}${l}`).join("\n");
      // A block needs a blank line before it or it joins the paragraph above.
      const before = d.body_md.slice(0, start);
      const lead = start === 0 || before.endsWith("\n\n") ? "" : "\n\n";
      return {
        text: lead + text,
        select: [lead.length + at(0).length, lead.length + text.length],
      };
    });

  function addLink() {
    const url = prompt(
      "Paste the web address.\n\nFor a page on Glufloat, type it like /app or /blog/eba.\nFor another website, paste the full address starting with https://",
    );
    if (!url) return;
    apply((sel) => {
      const words = sel || "the words people click";
      return { text: `[${words}](${url.trim()})`, select: [1, 1 + words.length] };
    });
  }

  /** Upload a picture and drop it into the body where the cursor was left. */
  async function addImage(file: File) {
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
    const alt =
      prompt("Say what is in the picture. Blind readers and Google both read this.") ??
      "";
    apply(() => ({ text: `\n\n![${alt}](${json.url})\n\n` }));
  }

  const tool =
    "rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-40";

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
    if (d.id === id) load(BLANK);
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
              onClick={() => load(BLANK)}
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
            {/*
              The prefix is shown but not editable. The founder asked whether
              they type the whole address or only the last part: only the last
              part, and this makes that obvious instead of explaining it.
            */}
            <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border-2 border-line focus-within:border-brand">
              <span className="flex select-none items-center bg-mist px-3 text-sm text-ink-soft">
                glufloat.com/blog/
              </span>
              <input
                id="slug"
                className="w-full bg-white px-3 py-2.5 text-ink outline-none"
                value={d.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder="is-eba-bad-for-diabetes"
              />
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              This fills in from the title on its own. You only change it if you
              want to.
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
                placeholder="The name of the dietitian who checked it"
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
              <>
                {/* Click these instead of typing the marks by hand. */}
                <div className="mt-2 flex flex-wrap gap-1.5 rounded-t-xl border-2 border-b-0 border-line bg-mist p-2">
                  <button type="button" className={tool} onClick={() => linePrefix("## ", "Your subhead")}>
                    Subhead
                  </button>
                  <button type="button" className={tool} onClick={() => linePrefix("### ", "Smaller subhead")}>
                    Smaller subhead
                  </button>
                  <span className="mx-1 w-px bg-line" />
                  <button type="button" className={`${tool} font-bold`} onClick={() => wrap("**", "bold words")}>
                    B
                  </button>
                  <button type="button" className={`${tool} italic`} onClick={() => wrap("*", "slanted words")}>
                    I
                  </button>
                  <span className="mx-1 w-px bg-line" />
                  <button type="button" className={tool} onClick={() => linePrefix("- ", "A point")}>
                    Bullets
                  </button>
                  <button
                    type="button"
                    className={tool}
                    onClick={() => linePrefix((i) => `${i + 1}. `, "First thing")}
                  >
                    Numbers
                  </button>
                  <button type="button" className={tool} onClick={() => linePrefix("> ", "Something worth pulling out")}>
                    Quote
                  </button>
                  <span className="mx-1 w-px bg-line" />
                  <button type="button" className={tool} onClick={addLink}>
                    Add a link
                  </button>
                  <label className={`${tool} cursor-pointer`}>
                    Add a picture
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) addImage(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <textarea
                  id="body"
                  ref={bodyRef}
                  rows={20}
                  className={`${input} mt-0 rounded-t-none text-base leading-relaxed`}
                  value={d.body_md}
                  onChange={(e) => {
                    set("body_md", e.target.value);
                    remember(e.currentTarget);
                  }}
                  // Every way the cursor can move is recorded, so a toolbar
                  // button always knows where the writer is standing.
                  onSelect={(e) => remember(e.currentTarget)}
                  onKeyUp={(e) => remember(e.currentTarget)}
                  onClick={(e) => remember(e.currentTarget)}
                  onBlur={(e) => remember(e.currentTarget)}
                  placeholder={
                    "Write here the way you would talk.\n\nSelect some words, then press a button above to make them a subhead, bold, a link, or a list."
                  }
                />
              </>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              Write normally. Select words first, then press a button. Press
              &ldquo;See how it will look&rdquo; to check it before you publish.
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
                  load(toDraft(p));
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
