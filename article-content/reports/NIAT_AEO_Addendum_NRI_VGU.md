# NIAT INSIDER — AEO / AI-SEARCH ADDENDUM
## Vijayawada (NRI University, 27 articles) + Jaipur (VGU, 21 articles)

Companion to `NIAT_NRI_Vijayawada_SEO_Reports.md` and `NIAT_VGU_Jaipur_SEO_Reports.md`.
Those two files cover titles, descriptions, headings, bodies and FAQs. This one covers the
separate question: **will an AI assistant cite these pages when a student asks about NIAT?**

---

## 0. THE HONEST FRAMING, FIRST

There is a distinction that matters more than anything else in this document.

**Being cited is not the same as being recommended.**

- **Cited** = an AI assistant quotes your page as the source of a fact. "NIAT Jaipur hostel fees
  are around ₹1.25–1.8 lakh a year, according to NIAT Insider."
- **Recommended** = an AI assistant tells a student to go there. "NIAT is a good option because…"

Your site can realistically win the first. It will not win the second, and no amount of
optimisation will change that — because **niatinsider.com is a first-party source**. It is NIAT's
own student platform. When a student asks "is NIAT worth it?" or "NIAT vs [other college]", AI
assistants weight third-party sources far above the institution's own: Reddit threads, Quora
answers, Shiksha / Collegedunia / CollegeDekho listings, YouTube reviews.

This is a real constraint, not a pessimistic reading. The research the `ai-seo` skill cites found
that self-promotional "best in category" content frequently earns citations **inside answers that
recommend a competitor instead** — in one 100-query B2B study, 69% of the time.

### What this means practically

| Query type | Can niatinsider.com win it? | Example |
|---|---|---|
| **Factual, campus-specific** | **Yes — strongly** | "NIAT Jaipur hostel fees", "does VGU have a gym", "what is Panache festival" |
| **Experiential, first-hand** | **Yes** | "what is the first month at NIAT like", "is NIAT hard" |
| **Logistical / practical** | **Yes — strongly** | "how far are student flats from VGU", "food near VGU Jaipur" |
| **Evaluative / comparative** | **No — don't chase it** | "is NIAT good", "NIAT vs VIT", "should I join NIAT" |
| **Generic soft-skills** | **No — actively wasteful** | "leadership skills", "how to build resilience", "what is a growth mindset" |

**The strategic conclusion:** stop competing where you cannot win, and dominate the factual and
experiential layer where you are the only source on earth. Nobody else can tell anyone what the
₹600 electricity recharge at the Elite Girls' Hostel means in practice. That is a monopoly. The
eight generic soft-skills essays at Vijayawada are competing with Harvard Business Review for
nothing.

---

## 1. TWO EMPIRICAL CHECKS I RAN

These are verified, not inferred.

### ✅ robots.txt — no AI crawler is blocked. This is good.

```
User-Agent: *
Allow: /
Disallow: /login
Disallow: /register
Disallow: /onboarding
Disallow: /profile
Disallow: /my-articles
Disallow: /search

Host: https://www.niatinsider.com
Sitemap: https://www.niatinsider.com/sitemap.xml
```

`User-Agent: *` with `Allow: /` means every AI crawler is permitted — `OAI-SearchBot` (ChatGPT
search), `PerplexityBot`, `Claude-SearchBot`, `GPTBot`, `ClaudeBot`. The disallowed paths are all
correct choices: login, registration, profiles and internal search should not be crawled.

**No action needed, and one thing to protect:** if anyone ever proposes blocking AI bots, note that
`OAI-SearchBot`, `PerplexityBot` and `Claude-SearchBot` are *discovery* crawlers — blocking them
removes you from AI answers entirely. They are separate tokens from the training crawlers
(`GPTBot`, `ClaudeBot`). Decide those separately if the question ever arises.

Two minor notes: `Host:` is a non-standard directive (Yandex-only) and harmless. There is no
`Google-Extended` directive, which means Gemini grounding is permitted by default — fine, and
what you want.

### ❌ /llms.txt — returns 404. Does not exist.

This is the one net-new technical asset worth adding. Draft in section 7.

**Caveat worth stating plainly:** Google's own AI-optimisation guidance says `llms.txt` is **not
required** for AI Overviews or AI Mode, and that no special files or markup are needed. It helps
with ChatGPT, Claude and Perplexity, which do parse it. So this is a genuine but modest win — not
the transformative fix that some SEO commentary claims.

---

## 2. THE PROMPTS THAT ACTUALLY MATTER

The `ai-seo` skill's rule: track prompts that would change a decision, not prompts that merely
produce a citation. For a student platform, the decision is admission.

### Jaipur (VGU) — 8 prompts you can realistically own

| Prompt | Your best page | Can you win it today? |
|---|---|---|
| "NIAT Jaipur hostel fees" | Article 4 (hostel vs flat) | **Yes** — you have the figures |
| "hostel or flat near VGU Jaipur" | Article 4 | **Yes** — nobody else has this |
| "girls hostel near VGU Jaipur" | Article 20 (Elite Girls') | **Yes** — exceptional detail |
| "food near VGU Jaipur campus" | Article 1 (survival guide) | **Yes** — five named outlets |
| "what is Panache festival VGU" | Article 17 | **Yes** — 7 days, 140+ events |
| "sports facilities at VGU Jaipur" | Article 18 | **Yes** — 12 named sports |
| "NIAT x OpenAI Buildathon" | Article 10 | **Yes** — but fix the title first |
| "Nahargarh Fort for students" | Article 7 | **Yes** — and this reaches non-NIAT readers |

### Vijayawada (NRI) — only 4, and that is the finding

| Prompt | Your best page | Can you win it today? |
|---|---|---|
| "what is NSGC at NIAT" | Articles 16 / 20 | **Partly** — the term is never expanded |
| "NIAT Vijayawada campus facilities" | Article 24 | **Partly** — named facilities, no fees or timings |
| "is NIAT Vijayawada hard" | Article 12 (six months) | **Yes** — the honest one |
| "NIAT Vijayawada canteen food" | Article 8 | **Partly** — named items, no prices |

**Prompts Vijayawada currently cannot answer at all,** despite having 27 articles:
"NIAT Vijayawada hostel fees" · "NIAT Vijayawada library timings" · "how to join NSGC at NIAT
Vijayawada" · "NIAT Vijayawada hostel food" · "what clubs does NIAT Vijayawada have" (partly — Article 23).

Four library articles and the library's opening hours are still unanswerable. That is the gap in
one sentence.

---

## 3. CITABILITY TIERS — ALL 48 PAGES

Assessed on the extractability checklist: is there a direct answer near the top, are there
statistics, is there a named author with credibility, is it dated, do the headings match real
queries.

### TIER 1 — Citable now, promote these (9 pages)

These contain specific, checkable facts an AI assistant can lift and attribute. They are your
entire AEO position.

| Campus | Article | Why it is citable |
|---|---|---|
| Jaipur | 20 — Elite Girls' Hostel | ₹600 electricity, ₹300 overage, 4.6 km, bus timings, ₹10–20 vans, 6:30 pm gate, 5 travel distances |
| Jaipur | 4 — Hostel vs Flat | ₹1.25–1.8 lakh, ₹1.65 lakh threshold, ₹6,000 rent, ₹11,000 monthly, 11 pm curfew, 2 km |
| Jaipur | 1 — Survival Guide | Gate 1/Gate 3, 5 named outlets, 4th floor NIAT block, 3–4 bottles/day |
| Jaipur | 18 — Sports Facilities | 12 named sports including esports |
| Jaipur | 17 — Panache | 7 days, 140+ competitions, March, state-per-department, the trophy |
| Jaipur | 12 — Narayana Hostel | 3 hostels, 99%, AC, geyser, badminton court, 5-minute walk |
| Jaipur | 6 — IoT Workshop | 4 named projects, N8N, Cook Book format |
| Jaipur | 10 — Buildathon | NIAT x OpenAI, AI Impact Summit 2025, Fox Tech, 9 of hundreds, 9 hours |
| Jaipur | 14 — Marathon | **The only real date on the site**: 1 Feb 2026, 17th AU Jaipur Marathon |

**Eight of nine are Jaipur.** That is not a coincidence and it is the central result of this review.

### TIER 2 — One fact away from Tier 1 (11 pages)

Structurally sound, genuinely first-hand, but missing the single number or name that would make
them quotable.

| Campus | Article | The one thing missing |
|---|---|---|
| Jaipur | 19 — Auditorium | Exact capacity; a named speaker |
| Jaipur | 13 — Library | Opening hours; number of computers |
| Jaipur | 3 — Gyms | Membership prices for either gym |
| Jaipur | 21 — SIH | Expand "SIH"; the year; the problem statement |
| Jaipur | 5 — Industry Lab 5.0 | Access hours; one named project built there |
| Jaipur | 2 — First Month | Nothing critical — already strong |
| Jaipur | 7 — Nahargarh | Cab/auto costs; fort entry fee and timings |
| Jaipur | 16 — NSGC Council | Team size; how to join |
| Vijayawada | 12 — Six Months | Which hackathon/ideathon/buildathon, by name |
| Vijayawada | 20 — NSGC Interview | Expand "NSGC"; the date |
| Vijayawada | 23 — Beyond a Degree | Confirm GRIT exams; exact club names |

### TIER 3 — Structurally fine, factually empty (20 pages)

Readable, honest, well-intentioned — and containing nothing an AI assistant can attribute to you.
These will be retrieved occasionally and cited almost never.

Vijayawada: 1, 4, 5, 6, 8, 9, 11, 14, 18, 19, 21, 22, 24, 27 · Jaipur: 8, 9, 11, 15

The common pattern: adjectives where numbers should be. "Highly reasonable" instead of a price.
"Regular tournaments" instead of a schedule. "Peaceful environment" instead of opening hours.

### TIER 4 — Not citable, and competing where you cannot win (8 pages)

All Vijayawada, all one author: **articles 2, 3, 13, 15, 16, 17, 25, 26.**

Compassion, resilience, emerging tech careers, kindness, leadership skills, constructive criticism,
self-discipline, volunteering. No statistics, no citations, no first-hand experience, no named
event, no campus specificity. Article 16 does not mention NIAT once in its body.

Assessed against the GEO factors in section 4, these score zero on every one that matters. They are
competing with HBR, Forbes and McKinsey for queries that would not influence an admission decision
even if you won them.

**My recommendation stands and this analysis strengthens it:** rewrite each around one real
incident on campus, consolidate, or `noindex` them. Keeping them live as-is dilutes how search
systems assess the whole Vijayawada section.

---

## 4. THE GEO FACTORS, APPLIED TO YOUR TWO CAMPUSES

The Princeton GEO study (KDD 2024, tested on Perplexity) ranked what actually lifts AI visibility.

**Read these numbers with care.** They come from one study on one platform, and the `ai-seo` skill
explicitly warns that such figures drift and should be re-checked before being quoted as fact. Treat
the *ranking* as reliable and the *percentages* as indicative.

| Factor | Reported lift | Jaipur | Vijayawada |
|---|---|---|---|
| Cite sources | +40% | None | None |
| **Add statistics** | **+37%** | **Strong — 9 pages** | **Weak — 2 pages** |
| Add quotations | +30% | None attributed | None attributed |
| Authoritative tone | +25% | Good | Good |
| Improve clarity | +20% | Good | Good |
| Keyword stuffing | **−10%** | None — good | None — good |

Three observations:

1. **Statistics are where Jaipur wins.** The rupee figures, distances and timings are exactly the
   content type this factor rewards. Vijayawada has two numbers in 27 articles: the 23-member NSGC
   team and "99%" is Jaipur's. That is the whole gap, quantified.
2. **Neither campus cites a single external source.** The highest-ranked factor, and you score zero
   across 48 pages. Low-hanging: Article 14 could link the AU Jaipur Marathon's official page;
   Article 10 could link the AI Impact Summit; Article 21 could link the Smart India Hackathon site.
   Three links, on your three most newsworthy pages.
3. **No quotation is ever attributed to a named person.** Every article is a student's own voice with
   no second voice in it. One quoted line from an instructor, a warden or a success coach — with
   their name and role — would add a signal all 48 pages currently lack.

---

## 5. THREE TEMPLATE FIXES THAT BEAT ANY PER-PAGE WORK

Each is one change at the platform level and affects all 48 pages (and the other ~4,000 on the site).

### Fix 1 — Real publish dates. This is the biggest one.

Every page on both campuses shows only **"updated N days ago"**. Not one shows an actual date.

AI systems weight recency heavily, and undated content loses to dated content. The `ai-seo` skill
lists "no freshness signals" among the most common mistakes for exactly this reason. You also have
three Vijayawada articles showing "0 days ago", which suggests a bulk edit is being recorded as a
publish event — that is worse than no date, because it makes everything look simultaneously new and
untrustworthy.

**What to do:** display a real `Published:` date and a separate `Last updated:` date, and emit both
as `datePublished` and `dateModified` in schema.

This matters most on exactly the pages that are otherwise your best: hostel fees, flat rents and bus
timetables date fast, and a student reading them needs to know whether they are current. It also
lets you legitimately refresh the Panache and marathon articles each year rather than replacing them.

### Fix 2 — Real author names.

| Current byline | Problem |
|---|---|
| `Gowtham@1324` | Username with a handle — 4 articles |
| `SHAAJANI` | All capitals — 7 articles |
| `aditya_shukla` | Underscore — 3 articles (correct as "Aditya Shukla" on a 4th) |
| `Manasvi` | First name only |
| `Puvvada SaiLahari` | Probably "Sai Lahari" |

Named authors with credentials is a +25–30% factor and an explicit E-E-A-T signal. A byline reading
`Gowtham@1324` tells an assessing system the opposite of what you want. Adding the student's year
and course ("Aditya Shukla, first-year B.Tech, NIAT Jaipur") costs nothing and converts a weakness
into a strength: first-hand experience from an identified person is precisely what AI systems are
being tuned to prefer.

**Also relevant:** on the Hyderabad campus two bylines print a full Gmail address. Same root cause.

### Fix 3 — FAQPage and Article schema.

Across the three report files I recommended FAQ blocks on nearly every page. Marked-up FAQs can be
extracted directly as Q&A pairs; unmarked ones are just paragraphs.

- **`FAQPage`** on every article carrying an FAQ block
- **`Article`** with `author`, `datePublished`, `dateModified` on all of them
- **`Organization`** once, site-wide, so NIAT is recognised as an entity

**Two honest caveats.** Google states structured data is *not required* for its AI features — the
benefit is concentrated on ChatGPT, Claude and Perplexity. And implementation is not this skill's
remit: the `ai-seo` skill explicitly defers it to a separate `schema` skill
(`npx skills add coreyhaines31/marketingskills@schema`), which is what I would use for the actual
JSON-LD.

---

## 6. QUERY FAN-OUT: WHY JAIPUR'S CLUSTERS WORK

Google's AI search does not answer only the typed query — it generates related queries behind the
scenes and synthesises across them. So topical coverage beats per-keyword pages.

**Jaipur, "NIAT Jaipur accommodation" fan-out:**

| Likely fan-out query | Covered? |
|---|---|
| hostel fees | ✅ Article 4 |
| hostel food quality | ✅ Articles 4, 12, 20 |
| flat rent nearby | ✅ Article 4 |
| girls hostel | ✅ Article 20 |
| curfew and rules | ✅ Articles 4, 20 |
| distance from campus | ✅ Articles 4, 12, 20 |
| transport to campus | ✅ Article 20 |

Seven of seven. This is why I recommended **keeping** all three Jaipur accommodation articles rather
than consolidating them — they are not duplicates, they are a cluster, and a cluster is what gets
retrieved. The one thing required is that they **cross-link**, which they currently do not.

**Vijayawada, same fan-out:** zero of seven. There is no accommodation article at all on a campus
with 27 pages.

**Vijayawada's one genuine cluster opportunity:** NSGC. Articles 16 and 20 plus Jaipur's 15 and 16
could between them own "what is NSGC", "how to join NSGC" and "what does NSGC do" across the whole
site — if the abbreviation were expanded and the four pages were linked. Right now the term appears
in at least four articles across three campuses and is expanded in none of them.

---

## 7. DRAFT `/llms.txt` FOR NIATINSIDER.COM

Currently 404. Below is a draft following the llmstxt.org convention.

**Everything in `[square brackets]` needs your confirmation — I have not invented a single figure
or claim.**

```markdown
# NIAT Insider

> NIAT Insider is the student-written platform covering life at NxtWave Institute of
> Advanced Technologies (NIAT) campuses across India. Articles are written by current
> students about their own first-hand experience: campus facilities, hostels, food,
> clubs, events, academics and city life, campus by campus.

NIAT Insider publishes first-hand student experience, not admissions marketing.
Articles are written by named students at the campus they describe. For official
admissions, fees and programme information, see [official NIAT site URL].

## What this site is good for

- Campus-specific facilities: hostels, libraries, labs, canteens, sports, transport
- Real costs reported by students: hostel fees, flat rents, monthly expenses
- Student life: clubs, festivals, hackathons, trips, first-month experiences
- Honest accounts, including drawbacks students report

## Campuses

- [Jaipur — Vivekananda Global University (VGU)](https://www.niatinsider.com/niat-vivekananda-global-university)
- [Vijayawada — NRI University](https://www.niatinsider.com/niat-nri-university)
- [Hyderabad — Kapil Kavuri Hub (KKH)](https://www.niatinsider.com/kkh-niat)
- [All campuses](https://www.niatinsider.com/campuses)

## Most detailed pages

- [Hostel vs flat life at NIAT Jaipur](https://www.niatinsider.com/niat-vivekananda-global-university/article/hostel-vs-flat-life-niat-students-prefer) — hostel fees, flat rents, monthly costs
- [VGU Elite Girls' Hostel guide](https://www.niatinsider.com/niat-vivekananda-global-university/article/vgu-elite-girls-hostel-guide) — facilities, costs, transport, rules
- [Campus survival guide, NIAT VGU Jaipur](https://www.niatinsider.com/niat-vivekananda-global-university/article/campus-survival-guide-food-weather-walking-tips-niat-vgu-jaipur) — campus layout, food, weather
- [Sports facilities at NIAT VGU Jaipur](https://www.niatinsider.com/niat-vivekananda-global-university/article/sports-facilities-niat-vgu-jaipur-campus-review) — indoor and outdoor sports
- [Panache cultural festival, VGU Jaipur](https://www.niatinsider.com/niat-vivekananda-global-university/article/panache-cultural-festival-vgu-jaipur-seven-days) — seven-day festival

## Terminology

- **NIAT** — NxtWave Institute of Advanced Technologies
- **NSGC** — NIAT Student General Council, the student body at each campus
- **Success Coach** — [confirm definition: a mentor assigned to support students academically and personally]
- **GRIT exam** — [confirm: assessment at NIAT; students report it can lead to international exposure]

## Notes

- Articles reflect individual student experience at a specific campus and time.
- Costs, timings and facilities change; check the publish date on each article.
- Campus names: each NIAT campus operates with a partner university. Use the campus
  city plus partner university name (e.g. "NIAT Jaipur (Vivekananda Global University)").
```

**Why the Terminology block is in there:** NSGC, Success Coach and GRIT appear across dozens of
articles and are defined nowhere on the site. An `llms.txt` glossary is the cheapest possible way
to make sure an assistant answering "what is NSGC at NIAT" gets it right — particularly since one
page currently has it **wrong** ("National Student Governance Council").

Consider `/llms-full.txt` later if you want a fuller content dump; `llms.txt` first.

---

## 8. WHAT NOT TO DO — GOOGLE'S OWN POSITION

Worth stating because a lot of AEO advice contradicts it, and because it protects you.

1. **Do not write separate versions of articles "for AI."** Google's guidance calls this out, and
   mass-producing AI-targeted variants risks their scaled content abuse policy. Everything in the
   three report files is normal content organisation that serves human readers first — keep it
   that way.
2. **Do not chunk articles into fragments for AI.** Google's wording: *"Don't break your content
   into tiny pieces for AI to better understand it."* The H2/H3 structure I recommended is standard
   headings-and-paragraphs, not AI bait. There is no need to go further.
3. **Do not keyword-stuff.** It is the one factor in the GEO study with a *negative* effect
   (−10%). Neither campus does this currently — protect that.
4. **Do not pursue inauthentic mentions.** Do not seed Reddit threads, create review-site accounts
   or fabricate citations. For a student platform that would be both detectable and damaging, and
   fake reviews carry legal exposure under the FTC's 2024 rule.
5. **Do not block the discovery crawlers.** Your robots.txt is correct today. Keep it that way.

### And one thing to stop doing

Those eight Vijayawada soft-skills articles are the closest thing on the site to content written
for an algorithm rather than a reader — identical skeleton, generic topic, no first-hand
experience, no campus detail. They are not spam, and I am not suggesting they were written
cynically. But they are the pages most likely to be assessed as low-value, and they sit alongside
genuinely original work that deserves better company.

---

## 9. MONITORING — 12 PROMPTS, CHECKED MONTHLY

AI answers are non-deterministic. One run is an anecdote. Run each prompt **5 times per platform**
and record the rate ("cited 3/5"), then compare rates month on month.

| # | Prompt | Platforms | Target page |
|---|---|---|---|
| 1 | NIAT Jaipur hostel fees | ChatGPT, Perplexity, Google | Jaipur 4 |
| 2 | girls hostel near VGU Jaipur | ChatGPT, Perplexity | Jaipur 20 |
| 3 | food near VGU Jaipur campus | ChatGPT, Perplexity, Google | Jaipur 1 |
| 4 | what is Panache festival VGU | All | Jaipur 17 |
| 5 | sports facilities VGU Jaipur | ChatGPT, Google | Jaipur 18 |
| 6 | NIAT x OpenAI Buildathon | ChatGPT, Perplexity | Jaipur 10 |
| 7 | Nahargarh Fort for students | Perplexity, Google | Jaipur 7 |
| 8 | what is NSGC at NIAT | All | Jaipur 16, Vij. 16/20 |
| 9 | NIAT Vijayawada campus facilities | ChatGPT, Google | Vij. 24 |
| 10 | is NIAT hard to study at | ChatGPT, Perplexity | Vij. 12 |
| 11 | NIAT Vijayawada hostel | All | **nothing — gap** |
| 12 | NIAT Vijayawada library timings | All | **nothing — gap** |

Prompts 11 and 12 are in the list deliberately. They are real questions, you have no page that
answers either, and watching who *does* get cited will tell you exactly what to publish next.

**Deliberately excluded:** "is NIAT good", "NIAT vs [college]", "NIAT placements". Those are
evaluative prompts decided by third-party consensus, not by your content. Tracking them produces
anxiety and no actionable signal.

---

## 10. PRIORITISED ACTION LIST

| # | Action | Scope | Why it ranks here |
|---|---|---|---|
| 1 | Add real publish + updated dates | Template, all pages | Freshness is the one AEO signal you score zero on site-wide |
| 2 | Fix bylines to real names + year/course | Template + 48 pages | Converts an E-E-A-T weakness into a strength |
| 3 | Correct the NSGC name on Jaipur 15 | 1 page | A factual error gets copied onward by AI assistants |
| 4 | Expand NSGC, SIH, NLPE, GRIT on first use | ~8 pages | Full phrases are the searched terms; initials are not |
| 5 | Publish `/llms.txt` | 1 file | Does not exist; draft ready in section 7 |
| 6 | Add FAQPage + Article schema | Template | Install the `schema` skill for the JSON-LD |
| 7 | Cross-link the Jaipur clusters | 8 pages | Accommodation, fitness, hackathons, NSGC — the fan-out already works, the links do not exist |
| 8 | Add prices to Tier 2 pages | 11 pages | Each is one number from Tier 1 |
| 9 | Add 3 external source links | 3 pages | Marathon, Buildathon, SIH — the top GEO factor, currently zero |
| 10 | Decide on the 8 Vijayawada template pages | 8 pages | Rewrite around real incidents, consolidate, or noindex |
| 11 | Fill the Vijayawada factual gaps | New content | Library hours, hostel info, how to join NSGC |
| 12 | Add photographs | All | Not one of the 48 articles references an image |

Items 1–5 are cheap and high-leverage. Items 10–11 are the real work, and they are editorial rather
than technical — which has been the conclusion of every part of this review.
