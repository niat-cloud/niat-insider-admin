/**
 * Helpers for article body HTML: cleaning pasted or legacy markup, preparing
 * it for the visual editor and the public-site preview, and measuring it for
 * the editor's pre-publish checks.
 */

/** The public site (niatinsider.com) builds article URLs on this origin. */
export const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.niatinsider.com"
).replace(/\/$/, "");

/** Articles shorter than this tend to fail Semrush's text-to-HTML ratio check on the public site. */
export const MIN_RECOMMENDED_WORDS = 450;

/**
 * Markup the visual editor cannot represent: the generated `ni-*` article
 * templates, tables and embeds. Loading such a body into TipTap and saving it
 * would silently strip that markup, so the editor opens these articles in
 * HTML mode instead.
 *
 * Stray classes, inline styles, spans and wrapper divs are not on this list.
 * Text copied from chat tools, Google Docs or Word is full of them (e.g.
 * `<p class="isSelectedEnd">`), they mean nothing on the public site, and
 * the visual editor simply drops them, so such articles stay editable.
 */
const UNSUPPORTED_TAGS = /<(table|iframe|video|audio|embed|object|figure|form|style)\b/i;
const TEMPLATE_CLASS = /\sclass\s*=\s*["'][^"']*\bni-[\w-]+/i;

export function hasUnsupportedMarkup(html: string): boolean {
  const body = html || "";
  return UNSUPPORTED_TAGS.test(body) || TEMPLATE_CLASS.test(body);
}

/** Same rule the public site applies before rendering: the title is the page's only H1. */
export function demoteH1(html: string): string {
  if (!html) return "";
  return html.replace(/<h1(\s[^>]*)?>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
}

/** Strips scripts and inline event handlers (mirrors the admin preview's existing rule). */
export function stripScripts(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function isBlank(el: Element): boolean {
  if (el.querySelector("img, hr, iframe, video")) return false;
  return (el.textContent ?? "").replace(/ /g, " ").trim() === "";
}

function parse(html: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

/** Removes empty list items, empty lists, and empty paragraphs/headings, then trims leading/trailing blank blocks. */
function removeEmptyBlocks(root: HTMLElement): number {
  let removed = 0;
  root.querySelectorAll("li").forEach((li) => {
    if (isBlank(li)) {
      li.remove();
      removed++;
    }
  });
  root.querySelectorAll("ul, ol").forEach((list) => {
    if (list.children.length === 0) list.remove();
  });
  root.querySelectorAll("p, h2, h3, h4, blockquote").forEach((el) => {
    if (isBlank(el)) {
      el.remove();
      removed++;
    }
  });
  return removed;
}

/**
 * Cleans HTML pasted from Google Docs, Word, Notion or chat tools: drops
 * styles, classes, ids, spans and fonts, maps H1 to H2 and H5/H6 to H4, and
 * removes the empty bullets and paragraphs those tools leave behind.
 */
export function cleanPastedHtml(html: string): string {
  const root = parse(html);
  if (!root) return html;

  root.querySelectorAll("meta, style, script, link, title, o\\:p").forEach((el) => el.remove());

  // Google Docs wraps the whole paste in <b id="docs-internal-guid-…" style="font-weight:normal">.
  root.querySelectorAll('b[id^="docs-internal-guid"]').forEach((el) => {
    el.replaceWith(...Array.from(el.childNodes));
  });

  root.querySelectorAll("span, font").forEach((el) => {
    el.replaceWith(...Array.from(el.childNodes));
  });

  root.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const keep =
        (el.tagName === "A" && (attr.name === "href" || attr.name === "target" || attr.name === "rel")) ||
        (el.tagName === "IMG" && (attr.name === "src" || attr.name === "alt"));
      if (!keep) el.removeAttribute(attr.name);
    }
  });

  const rename = (from: string, to: string) => {
    root.querySelectorAll(from).forEach((el) => {
      const next = document.createElement(to);
      next.append(...Array.from(el.childNodes));
      el.replaceWith(next);
    });
  };
  rename("h1", "h2");
  rename("h5", "h4");
  rename("h6", "h4");

  removeEmptyBlocks(root);
  return root.innerHTML;
}

/**
 * Tidies a body already in the editor: removes empty bullets and blank
 * paragraphs. Returns the new HTML and how many blocks were removed.
 */
export function cleanBodyHtml(html: string): { html: string; removed: number } {
  const root = parse(html);
  if (!root) return { html, removed: 0 };
  const removed = removeEmptyBlocks(root);
  return { html: root.innerHTML, removed };
}

/**
 * Prepares stored HTML for the visual editor, which only knows H2–H4:
 * H1 becomes H2 (as on the public site) and H5/H6 become H4, so no heading
 * is turned into a plain paragraph on load.
 *
 * It also undoes two leftovers of copying from chat tools that the editor
 * would otherwise make worse: whole passages wrapped in inline `<code>`
 * (shown as one long monospace run) and blank lines inside a single `<p>`
 * (collapsed into one paragraph). Nothing is saved until the admin edits.
 */
export function prepareBodyForEditor(html: string): string {
  const headings = demoteH1(html || "")
    .replace(/<h[56](\s[^>]*)?>/gi, "<h4$1>")
    .replace(/<\/h[56]>/gi, "</h4>");
  const root = parse(headings);
  if (!root) return headings;

  root.querySelectorAll("code").forEach((code) => {
    if (code.closest("pre")) return;
    const text = code.textContent ?? "";
    if (text.includes("\n") || text.length > 120) {
      code.replaceWith(...Array.from(code.childNodes));
    }
  });

  root.querySelectorAll("p").forEach((p) => {
    const parts = p.innerHTML.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) return;
    const paragraphs = parts.map((part) => {
      const next = document.createElement("p");
      next.innerHTML = part;
      return next;
    });
    p.replaceWith(...paragraphs);
  });

  return root.innerHTML;
}

export type BodyStats = {
  words: number;
  readMinutes: number;
  h2: number;
  h3: number;
  links: number;
  inlineImages: number;
  imagesMissingAlt: number;
  emptyBlocks: number;
};

export function getBodyStats(html: string): BodyStats {
  const text = (html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, "x");
  const words = text.split(/\s+/).filter(Boolean).length;
  const count = (re: RegExp) => (html.match(re) ?? []).length;

  let emptyBlocks = 0;
  const root = parse(html || "");
  if (root) {
    root.querySelectorAll("li, p, h2, h3, h4").forEach((el) => {
      if (isBlank(el)) emptyBlocks++;
    });
  }

  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  return {
    words,
    readMinutes: Math.max(1, Math.round(words / 200)),
    h2: count(/<h[12][\s>]/gi),
    h3: count(/<h3[\s>]/gi),
    links: count(/<a\s[^>]*href=/gi),
    inlineImages: imgTags.length,
    imagesMissingAlt: imgTags.filter((t) => !/\salt\s*=\s*"[^"]+"/i.test(t)).length,
    emptyBlocks,
  };
}

/** Lowercase, hyphenated slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
