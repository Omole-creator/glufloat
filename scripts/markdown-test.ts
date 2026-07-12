/**
 * Tests for the blog's Markdown renderer.
 *
 *   npx tsx scripts/markdown-test.ts
 *
 * The security half is the important half. Post text is rendered with
 * dangerouslySetInnerHTML, so if renderMarkdown can ever be made to emit a live
 * tag, a blog post becomes a script on the page. It escapes everything and
 * builds the tags itself, and these cases hold it to that.
 *
 * Run this after ANY edit to lib/markdown.ts.
 */
import { extractHeadings, renderMarkdown, readingMinutes } from "../lib/markdown";

let fail = 0;
const t = (name: string, ok: boolean, got?: string) => {
  console.log((ok ? "PASS  " : "FAIL  ") + name);
  if (!ok) {
    fail++;
    if (got) console.log("        got: " + got);
  }
};

/**
 * Escaped text is harmless: "&lt;img onerror=x&gt;" is just words on the page.
 * What would actually hurt is a LIVE tag, so that is what we look for: a real
 * script/iframe, an on* handler inside a real tag, or a javascript: href.
 */
function dangerous(html: string): boolean {
  if (/<\s*(script|iframe|object|embed|style|form)\b/i.test(html)) return true;
  if (/<[a-z][^>]*\son\w+\s*=/i.test(html)) return true;
  if (/(href|src)\s*=\s*"\s*(javascript|data:text\/html|vbscript)/i.test(html)) return true;
  return false;
}

const evil = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`,
  `<a href="#" onclick="alert(1)">x</a>`,
  `<iframe src="https://evil.com"></iframe>`,
  `[click me](javascript:alert(1))`,
  `[click](JaVaScRiPt:alert(1))`,
  `![x](javascript:alert(1))`,
  `[x](data:text/html;base64,PHNjcmlwdD4=)`,
  `**bold <script>alert(1)</script>**`,
  `> <script>alert(1)</script>`,
  "```\n<script>alert(1)</script>\n```",
  `![a](https://ok.com/a.png" onerror="alert(1))`,
];
for (const src of evil) {
  const out = renderMarkdown(src);
  const bad = dangerous(out);
  t(`no live tag from: ${src.slice(0, 40).replace(/\n/g, " ")}`, !bad, bad ? out : undefined);
}

console.log("");

t("heading gets an id", renderMarkdown("## How much eba?").includes('id="how-much-eba"'));
t("bold", renderMarkdown("**yes**").includes("<strong>yes</strong>"));
t("italic", renderMarkdown("some *word* here").includes("<em>word</em>"));
t("bullets", renderMarkdown("- one\n- two").includes("<li>two</li>"));
t("numbered list", renderMarkdown("1. one\n2. two").includes("<ol"));
// Regression: escaping the document before parsing turned "> quote" into
// "&gt; quote", so the marker was gone before the parser saw it. Blocks are now
// matched on the raw line and escaped on the way out.
t("blockquote", renderMarkdown("> careful").includes("<blockquote"));
t("blockquote keeps its words", renderMarkdown("> careful").includes("careful"));
t("horizontal rule", renderMarkdown("---").includes("<hr"));
t("internal link", renderMarkdown("[app](/app)").includes('href="/app"'));
t("external link is safe", renderMarkdown("[x](https://a.com)").includes('rel="noopener noreferrer"'));
t("image lazy-loads", renderMarkdown("![a cat](https://a.com/c.jpg)").includes('loading="lazy"'));
t("code block stays literal", renderMarkdown("```\n<b>hi</b>\n```").includes("&lt;b&gt;hi&lt;/b&gt;"));
t("a greater-than in prose survives", renderMarkdown("5 > 3 is true").includes("5 &gt; 3"));
t("reading time is never zero", readingMinutes("hi") === 1);
t("ampersand escaped", renderMarkdown("salt & pepper").includes("&amp;"));

// Regression: a writer who leaves a blank line between the points makes each one
// its own list, and every list used to restart at "1." -> 1, 1, 1, 1 on the live
// page. The number they typed is now carried through as the list's start.
t(
  "a numbered point standing alone keeps its number",
  renderMarkdown("1. one\n\n2. two\n\n3. three").includes('start="2"') &&
    renderMarkdown("1. one\n\n2. two\n\n3. three").includes('start="3"'),
);
t(
  "a list that starts at 1 needs no start attribute",
  !renderMarkdown("1. one\n2. two").includes("start="),
);
// An unterminated code fence is the one path that used to emit post text raw.
t(
  "an unclosed code fence is still escaped",
  renderMarkdown("```\n<script>alert(1)</script>").includes("&lt;script&gt;"),
);

const toc = extractHeadings("# Title\n\n## How much eba?\n\n### **Bold** bit\n\n```\n## not a heading\n```");
t("contents lists the h2 and h3 only", toc.length === 2);
t("contents id matches the rendered heading id", toc[0].id === "how-much-eba");
t("contents strips the markdown marks", toc[1].text === "Bold bit");

// A real post asks the same question twice, and two headings then carried the
// same id: React complained about the duplicate key, and every jump link for the
// second one landed on the first.
const twice = "## Is eba safe?\n\ntext\n\n## Is eba safe?\n\nmore";
t("a repeated heading gets its own id", renderMarkdown(twice).includes('id="is-eba-safe-2"'));
t(
  "the contents list agrees with the ids in the article",
  extractHeadings(twice).map((h) => h.id).join() === "is-eba-safe,is-eba-safe-2",
);
t(
  "an h1 with the same words still shifts the h2's id",
  extractHeadings("# Eba\n\n## Eba")[0].id === "eba-2",
);

console.log("");
console.log(fail === 0 ? "ALL MARKDOWN TESTS PASS" : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
