import { MIN_RECOMMENDED_WORDS, type BodyStats } from "@/lib/articleBody";
import type { ArticleEditFormValues } from "@/lib/schemas/article";

export type CheckLevel = "ok" | "warn" | "error";
export type ArticleCheck = { id: string; level: CheckLevel; message: string };

/** Google typically shows about this many characters before truncating. */
export const META_TITLE_RANGE = { min: 30, max: 60 } as const;
export const META_DESCRIPTION_RANGE = { min: 120, max: 160 } as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Pre-publish checks shown in the editor sidebar. They are guidance only and
 * never block saving, except the ones the form schema already enforces.
 */
export function getArticleChecks(values: ArticleEditFormValues, stats: BodyStats): ArticleCheck[] {
  const checks: ArticleCheck[] = [];
  const add = (id: string, level: CheckLevel, message: string) => checks.push({ id, level, message });

  add("title", values.title.trim() ? "ok" : "error", values.title.trim() ? "Title is set" : "Add a title");

  if (!values.slug.trim()) add("slug", "error", "Add a URL slug");
  else if (!SLUG_PATTERN.test(values.slug)) add("slug", "warn", "Slug should be lowercase words joined by hyphens");
  else add("slug", "ok", "URL slug looks good");

  add(
    "excerpt",
    values.excerpt?.trim() ? "ok" : "warn",
    values.excerpt?.trim() ? "Excerpt is set" : "Add an excerpt. It is shown on article cards"
  );

  if (stats.words === 0) add("words", "error", "The article body is empty");
  else if (stats.words < MIN_RECOMMENDED_WORDS)
    add("words", "warn", `${stats.words} words. Articles under ${MIN_RECOMMENDED_WORDS} words tend to fail the text-to-HTML check`);
  else add("words", "ok", `${stats.words} words`);

  if (stats.words >= 250 && stats.h2 === 0) add("headings", "warn", "No H2 section headings. Break the article into sections");
  else if (stats.h2 > 0) add("headings", "ok", `Uses ${stats.h2} H2 section${stats.h2 === 1 ? "" : "s"}`);

  if (stats.emptyBlocks > 0)
    add("empty", "warn", `${stats.emptyBlocks} empty bullet${stats.emptyBlocks === 1 ? "" : "s"} or paragraph${stats.emptyBlocks === 1 ? "" : "s"}. Use "Clean up" in the toolbar`);

  if (stats.imagesMissingAlt > 0)
    add("alt", "warn", `${stats.imagesMissingAlt} image${stats.imagesMissingAlt === 1 ? "" : "s"} in the body without alt text`);

  add(
    "cover",
    values.cover_image ? "ok" : "warn",
    values.cover_image ? "Cover image is set" : "No cover image. Cards and social shares will have no picture"
  );

  const mt = (values.meta_title ?? "").trim().length;
  if (mt === 0) add("meta_title", "warn", "No meta title. Search engines will use the article title");
  else if (mt > META_TITLE_RANGE.max) add("meta_title", "warn", `Meta title is ${mt} characters. Google cuts it off after about ${META_TITLE_RANGE.max}`);
  else if (mt < META_TITLE_RANGE.min) add("meta_title", "warn", `Meta title is short (${mt} characters)`);
  else add("meta_title", "ok", "Meta title length is good");

  const md = (values.meta_description ?? "").trim().length;
  if (md === 0) add("meta_description", "warn", "No meta description");
  else if (md > META_DESCRIPTION_RANGE.max)
    add("meta_description", "warn", `Meta description is ${md} characters. Google cuts it off after about ${META_DESCRIPTION_RANGE.max}`);
  else if (md < META_DESCRIPTION_RANGE.min) add("meta_description", "warn", `Meta description is short (${md} characters)`);
  else add("meta_description", "ok", "Meta description length is good");

  if (values.status === "rejected" && !values.rejection_reason?.trim())
    add("rejection", "error", "Add a rejection reason so the author knows what to fix");

  return checks;
}
