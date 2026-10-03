/**
 * Article categories as the public site (niatinsider.com) shows them. Mirrors
 * `src/data/articleCategories.ts` in the niatinsider repo: same slugs, labels
 * and chip colours, so the editor preview matches the live page.
 *
 * Categories are admin-managed rows in the backend, so an article may carry a
 * slug that is not listed here; `getCategoryConfig` humanizes those instead of
 * failing.
 */

export type CategoryConfig = {
  value: string;
  label: string;
  bg: string;
  text: string;
  border: string;
};

export const ARTICLE_CATEGORIES: CategoryConfig[] = [
  { value: "onboarding-kit", label: "Onboarding Kit", bg: "#f3f0ff", text: "#7678ed", border: "#7678ed" },
  { value: "30-days-at-niat", label: "30 Days at NIAT", bg: "#fdf2f8", text: "#be185d", border: "#be185d" },
  { value: "survival-food", label: "Survival & Food", bg: "#fff7ed", text: "#c2410c", border: "#c2410c" },
  { value: "club-directory", label: "Club Directory", bg: "#fef2f2", text: "#991b1b", border: "#991b1b" },
  { value: "career-wins", label: "Career & Wins", bg: "#f0fdf4", text: "#15803d", border: "#15803d" },
  { value: "local-travel", label: "Local Travel", bg: "#f0f9ff", text: "#0369a1", border: "#0369a1" },
  { value: "amenities", label: "Amenities", bg: "#f5f3ff", text: "#6d28d9", border: "#6d28d9" },
];

const DEFAULT_STYLE = { bg: "#f1f5f9", text: "#475569", border: "#94a3b8" };

function humanize(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getCategoryConfig(slug: string): CategoryConfig {
  const found = ARTICLE_CATEGORIES.find((c) => c.value === slug);
  if (found) return found;
  return { value: slug, label: slug ? humanize(slug) : "Uncategorized", ...DEFAULT_STYLE };
}

/** Options for a category select, keeping the article's current slug even if it is not in the known list. */
export function categoryOptionsFor(current: string | undefined): CategoryConfig[] {
  if (!current || ARTICLE_CATEGORIES.some((c) => c.value === current)) return ARTICLE_CATEGORIES;
  return [...ARTICLE_CATEGORIES, getCategoryConfig(current)];
}
