# CLAUDE.md

Admin portal for NIAT Insider (Next.js). It talks directly to the Django
backend at `NEXT_PUBLIC_API_URL` with a JWT from the phone + OTP login.
The committed `.env.local` points at a Replit dev backend, not production.

## Editing article bodies from a session (no admin UI, no Replit)

`scripts/article-body.mjs` saves article bodies through the same admin API
the editor uses (`PATCH /api/articles/admin/articles/<id>/`), so the
backend's validation and page revalidation run as usual. No dependencies.

Settings (cloud environment variables; the backend host must be allowed in
the environment's network access):
- `NIAT_API_BASE`: the production backend origin (same as the deployed
  admin's `NEXT_PUBLIC_API_URL`).
- `NIAT_ADMIN_REFRESH_TOKEN` (secret): an admin session refresh token. The
  backend rotates and blacklists refresh tokens, so it works once per
  session and needs a fresh one next time. Never ask for it in chat.
- `NIAT_ADMIN_PHONE`: only for `login` (OTP) when no token is stored.

Workflow, one file per article named by slug in `article-content/`:
```bash
node scripts/article-body.mjs pull <slug>...           # current body -> article-content/<slug>.html
node scripts/article-body.mjs push article-content/*.html     # dry run: checks + word counts
node scripts/article-body.mjs push article-content/<slug>.html --apply
node scripts/article-body.mjs push article-content/<slug>.html --apply --allow-under-floor  # only when the live body is shorter still
node scripts/article-body.mjs restore article-content/backups/<run>/<slug>.json --apply
```
`.md`/`.txt` files are converted (## headings, - lists, **bold**, links).
An optional `article-content/<slug>.meta.json` (`title`, `meta_title`,
`meta_description`, `meta_keywords` as a list) is saved in the same PATCH;
the dry run shows old -> new per field, and `meta_title` over 60 or
`meta_description` over 160 characters blocks the save. Every save also
sends the current slug, so a new title never changes the URL. Lookup uses
the public slug endpoint for published articles, so it still works after a
title change.
Checks block an `<h1>` (the page renders the only one), scripts/styles,
pasted Google Docs/data: images and bodies under 450 words (every article
under 450 failed the Oct 2026 text-to-HTML audit); they warn on more than
one FAQ heading and on bodies under 600 or over ~1,500 words. The dry run
also lists names and numbers the live body has and the new one drops, so a
rewrite that loses specifics shows up even when it is not shorter, and the
reverse: numbers and times of day (ADDED) and capitalised names (added) the
new body has and the live one does not, so an invented detail shows up. Every `--apply` backs up the live
body first; commit `article-content/` (bodies and backups) so changes can
be undone after the session ends. Rules for content: keep the student's
text as written, add only what the article supports, no fees/placement/
exam claims the article doesn't make.

## Images inside the article body

Articles have two kinds of images:
- **Carousel images** (the "Images" strip above the editor, `images[]` and
  `cover_image`): shown under the title on the live site; the cover is used
  on cards and social shares.
- **In-text images**: placed anywhere in the body (after the intro, between
  questions, ...). They are plain `<img src alt>` tags in the body HTML and
  are not added to `images[]`, so they never show twice.

In the editor (`components/articles/RichTextEditor.tsx`): the image button
in the toolbar uploads (same `/api/articles/upload_image/`) and inserts at
the cursor, with alt text; it can also place one of the carousel images.
Image files dragged or pasted into the text are uploaded and placed there.
Clicking an image shows its toolbar: alt text, move up / down one block,
remove. No backend change: the body already stores the HTML.

The public site renders body images only from `media.niatinsider.com`
(`ARTICLE_MEDIA_HOSTS` in both repos, keep in sync) and drops others; the
editor warns about such images and the checks sidebar counts them. No
captions yet: `<figure>` would force the article into HTML mode
(`hasUnsupportedMarkup`).

## Know NIAT category

Choosing the **Know NIAT** category (`know-niat`, `lib/articleCategories.ts`)
takes an article off its campus on the public site: it moves to
`/article/<slug>` (the old campus URL redirects), its breadcrumb becomes
Home > Know NIAT > title, and it is listed on `/know-niat`; ticking Featured
pins it at the top there. The stored campus is kept, so choosing another
category sends it back. The category must exist as a Category row in the
backend with exactly that slug. Mirrors `src/lib/articlePath.ts` in the
niatinsider repo.

## Featured articles

Ticking **Featured** (the star on each article card, the bulk "Feature" /
"Unfeature" buttons, or the switch in the editor) puts a published article
in the public home page's Featured section, newest first, up to 8
(`src/lib/homeFeaturedArticles.ts` in the niatinsider repo). The articles
list filters on it with "Featured only" / "Not featured" (`featured=true|false`,
kept in the URL). The home page re-reads the list every 5 minutes, so a change
can take that long to show; a featured article that is not published yet
shows once it is published.

## How-To Guides

`/guides` is the review queue for How-To Guides (students' success stories,
a separate product from articles). It uses the backend's moderation API
(`/api/admin/guides/...`, `lib/api/guides.ts`, types in `types/guide.ts`
mirroring `guides/admin_serializers.py`). Moderators and admins can review;
restoring a taken-down guide and `/guides/categories` (categories and the
questions writers answer) are admin only.

- The queue opens on guides waiting for review, oldest submission first.
  Bulk Publish / Send back only act on pending guides.
- `/guides/<slug>` shows the guide in the public site's styles, the backend's
  submit rules recomputed (`lib/guideReview.ts`, keep in sync with
  `guides/validation.py`), the author's contact details and the status
  history. Publish stays disabled until the reviewer ticks the
  `REVIEW_CHECKLIST`: achievements are self-reported, so the reviewer is the
  only check. After a decision it opens the next pending guide.
- Reject and take down need a reason of at least 10 characters; the author
  sees it on the site's `/how-to-guides/mine`. `REJECT_TEMPLATES` are
  starting points, edited before sending.
- Edits (title, achievement, summary, search text, featured) never change the
  status. Publish, take down and edits of a live guide make the backend
  revalidate the site's `/how-to-guides` pages.
- Links go to the site (niatinsider repo): live guides at
  `/how-to-guides/<category>/<slug>`, others at `/how-to-guides/preview/<slug>`
  (needs a moderator login on the site). Featured guides show in "Stories
  worth starting with" on `/how-to-guides`.
