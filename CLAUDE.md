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
