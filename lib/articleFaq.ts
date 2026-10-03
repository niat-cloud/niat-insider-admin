export type ArticleFaqItem = { question: string; answer: string };

/**
 * Normalizes an article's stored `faq_schema` into a clean list. Same rules as
 * niatinsider's `src/lib/articleFaq.ts`, so the preview shows exactly the FAQs
 * the live article page renders: anything that is not a non-empty
 * question/answer string pair is dropped, and duplicate questions are skipped.
 */
export function parseArticleFaq(raw: unknown): ArticleFaqItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ArticleFaqItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { question, answer } = entry as Record<string, unknown>;
    if (typeof question !== "string" || typeof answer !== "string") continue;
    const q = question.trim();
    const a = answer.trim();
    const key = q.toLowerCase();
    if (!q || !a || seen.has(key)) continue;
    seen.add(key);
    items.push({ question: q, answer: a });
  }
  return items;
}
