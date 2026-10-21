/**
 * Review helpers for How-To Guides: the backend's submit rules (so a reviewer
 * sees why a guide is or isn't complete), the reviewer checklist, ready-made
 * reasons for the author, and links to the guide on the public site.
 */
import { PUBLIC_SITE_URL } from "@/lib/articleBody";
import type { AdminGuideDetail, GuideStatus } from "@/types/guide";

/** Mirrors the backend submit rules (guides/validation.py). */
export const GUIDE_RULES = {
  title: [10, 200],
  achievement: [10, 160],
  summary: [40, 300],
  answerMinChars: 150,
  minWords: 600,
  reasonMinChars: 10,
} as const;

export const GUIDE_STATUS_LABEL: Record<GuideStatus, string> = {
  draft: "Draft",
  pending: "Waiting for review",
  published: "Live",
  rejected: "Sent back",
  taken_down: "Taken down",
};

export function guideText(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h\d|\/blockquote)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, "x")
    .replace(/\s+/g, " ")
    .trim();
}

export function guideWords(text: string): number {
  return text ? text.split(" ").filter(Boolean).length : 0;
}

export type GuideCheck = { label: string; ok: boolean; detail: string };

/**
 * What the backend checked on submit, recomputed from the stored guide.
 * `requiredPromptIds` (from the public categories endpoint) limits the
 * 150-character rule to required questions, as the backend does; without it
 * every answered question is held to it.
 */
export function guideChecks(guide: AdminGuideDetail, requiredPromptIds?: Set<string>): GuideCheck[] {
  const len = (s: string) => s.trim().length;
  const range = (label: string, value: string, [min, max]: readonly [number, number]): GuideCheck => ({
    label,
    ok: len(value) >= min && len(value) <= max,
    detail: `${len(value)} characters (${min}–${max})`,
  });
  const answered = guide.sections.filter((s) => s.kind !== "wish_i_knew" && guideText(s.body));
  const short = answered.filter(
    (s) =>
      guideText(s.body).length < GUIDE_RULES.answerMinChars &&
      (!requiredPromptIds || (s.prompt_id != null && requiredPromptIds.has(s.prompt_id)))
  );
  const answeredIds = new Set(answered.map((s) => s.prompt_id));
  const missing = requiredPromptIds ? [...requiredPromptIds].filter((id) => !answeredIds.has(id)).length : 0;
  const wish = guide.sections.find((s) => s.kind === "wish_i_knew");
  const wishChars = wish ? guideText(wish.body).length : 0;
  const words = guide.sections.reduce((n, s) => n + guideWords(guideText(s.body)), 0);
  return [
    range("Title", guide.title, GUIDE_RULES.title),
    range("Achievement", guide.achievement, GUIDE_RULES.achievement),
    range("Summary", guide.summary, GUIDE_RULES.summary),
    {
      label: "Answers",
      ok: answered.length > 0 && short.length === 0 && missing === 0,
      detail:
        missing > 0
          ? `${missing} required ${missing === 1 ? "question" : "questions"} not answered`
          : short.length > 0
            ? `${short.length} of ${answered.length} under ${GUIDE_RULES.answerMinChars} characters`
            : `${answered.length} answered`,
    },
    {
      label: "What I wish I knew",
      ok: wishChars >= GUIDE_RULES.answerMinChars,
      detail: wish ? `${wishChars} characters` : "Missing",
    },
    { label: "Length", ok: words >= GUIDE_RULES.minWords, detail: `${words} words (${GUIDE_RULES.minWords}+)` },
  ];
}

/**
 * What a reviewer checks by reading, which no rule can. Achievements are
 * self-reported (no proof upload), so the reviewer is the only check.
 */
export const REVIEW_CHECKLIST: { title: string; hint: string }[] = [
  {
    title: "The achievement is believable and specific",
    hint: "A named company, program, event or result. Ask the author if it sounds inflated or vague.",
  },
  {
    title: "A junior could follow it",
    hint: "Real steps, timelines and decisions, not just “work hard and stay consistent”.",
  },
  {
    title: "It's the student's own story",
    hint: "Written in their voice. Not copied from a blog, a course page or an AI tool.",
  },
  {
    title: "Nothing private or risky",
    hint: "No phone numbers, emails, offer letters, salary slips or other people's details.",
  },
  {
    title: "No promotion",
    hint: "Links help the reader (courses, docs, tools), not referral codes or paid coaching.",
  },
  {
    title: "No claims NIAT wouldn't stand behind",
    hint: "Fees, placement guarantees or exam promises the guide can't back up.",
  },
];

/** Starting points for a rejection; the reviewer edits before sending. */
export const REJECT_TEMPLATES: { label: string; text: string }[] = [
  {
    label: "Needs more steps",
    text:
      "Thanks for sharing this! Juniors need to know exactly what you did. Please add the concrete steps: what you prepared, which resources you used, how long it took, and what you would do differently.",
  },
  {
    label: "Achievement unclear",
    text:
      "Please make your achievement line specific: the company, program or event, your role and when it happened. Readers decide whether to read on from that one line.",
  },
  {
    label: "Remove personal details",
    text:
      "Please remove the personal details (phone numbers, emails, documents or other people's information) and resubmit. Everything else can stay as it is.",
  },
  {
    label: "Not original",
    text:
      "Parts of this read as copied or generated text. We publish students' own experiences, so please rewrite those parts in your own words, the way you'd explain it to a junior.",
  },
  {
    label: "Promotional links",
    text:
      "Please remove the referral or promotional links. Links to free resources, docs and courses that helped you are welcome.",
  },
];

export const TAKEDOWN_TEMPLATES: { label: string; text: string }[] = [
  {
    label: "Reported as inaccurate",
    text: "This guide was reported as inaccurate. We have taken it down while we check the details with you.",
  },
  {
    label: "Private information",
    text: "This guide contains private information that should not be public. Please remove it and resubmit.",
  },
];

/** The live page on the public site (`/how-to-guides/<category>/<slug>` in the niatinsider repo). */
export function guidePublicUrl(guide: { slug: string; category: { slug: string } }): string {
  return `${PUBLIC_SITE_URL}/how-to-guides/${guide.category.slug}/${guide.slug}`;
}

/**
 * The site's preview of a guide that isn't live (niatinsider
 * `/how-to-guides/preview/<slug>`). It needs a moderator login on the site.
 */
export function guidePreviewUrl(slug: string): string {
  return `${PUBLIC_SITE_URL}/how-to-guides/preview/${slug}`;
}

export function formatGuideDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** "3 days" since submission, for spotting guides that have waited too long. */
export function waitingFor(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}
