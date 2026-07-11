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
import { renderMarkdown, readingMinutes } from "../lib/markdown";

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

console.log("");
console.log(fail === 0 ? "ALL MARKDOWN TESTS PASS" : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
