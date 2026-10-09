#!/usr/bin/env python3
"""Build the NIAT Yenepoya (Mangalore) articles from the pulled live bodies
(article-content/<slug>.html) + the SEO report's metadata.

The report has no bodies, so the students' text stays as written. Fixes are
formatting only: headings one level up (the pasted drafts used h3/h4, so
the page had no h2), chat-app classes stripped, the "Introduction" heading,
pasted title/byline lines and an opening paragraph that repeats the next one
removed, "--" to an em dash. Article 10 is merged into Article 8.

  python3 article-content/reports/yenepoya_build.py
"""
import json
import os
import re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


# The bodies as they were before this change (the files in article-content/
# now hold the saved versions; the backend strips the editor's hidden
# image cards on save, and those images stay in the article's gallery).
BEFORE = os.path.join(OUT, "backups", "20261009T054657Z")


def read(slug):
    return json.load(open(os.path.join(BEFORE, f"{slug}.json"), encoding="utf-8"))["body"]


def write(slug, body, meta):
    open(os.path.join(OUT, f"{slug}.html"), "w", encoding="utf-8").write(body.strip() + "\n")
    json.dump(meta, open(os.path.join(OUT, f"{slug}.meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("built", slug)


def dashes(html):
    return re.sub(r"(>[^<]*)", lambda m: m.group(1).replace("--", "—"), html)


def clean(html):
    # Classes from the chat app the drafts were pasted from; keep image cards.
    html = re.sub(r'\sclass="(?!article-image-card)[^"]*"', "", html)
    html = re.sub(r"<(/?)h4\b", r"<\1h5", html)
    html = re.sub(r"<(/?)h3\b", r"<\1h2tmp", html)
    html = re.sub(r"<(/?)h5\b", r"<\1h3", html)
    html = html.replace("<h2tmp", "<h2").replace("</h2tmp", "</h2")
    html = re.sub(r"<h2>Introduction</h2>\s*", "", html)
    return dashes(html)


def cut(html, start, end):
    """Remove html[start-marker : end-marker), asserting both are present."""
    i = html.index(start)
    j = html.index(end, i)
    return html[:i] + html[j:]


def replace_once(html, old, new):
    assert html.count(old) == 1, old[:60]
    return html.replace(old, new)


def kw(*k):
    return [x.lower() for x in k]


META = {
    "first-year-ai-app-1000-users-global-reach-hackmate": {
        "title": "I Built an AI App in My First Year. It Reached 10 Countries.",
        "meta_title": "I Built an AI App in First Year: 1,000+ Users",
        "meta_description": "A first-year student at NIAT Yenepoya built HACK-MATE, an AI app that reached 1,000+ users across 10+ countries in a month, with 360 developers cloning it.",
        "meta_keywords": kw("HACK-MATE", "first-year student AI app", "student-built AI tool India", "open source project first year", "NIAT Yenepoya student projects"),
    },
    "yenepoya-students-openai-buildathon-top-74-global": {
        "title": "From 75,000 Participants to Top 74: Our Buildathon Story",
        "meta_title": "Top 74 of 75,000: Our OpenAI Buildathon 2026 Story",
        "meta_description": "Two first-year students from NIAT Yenepoya finished in the top 74 of 75,000+ teams at the OpenAI Buildathon 2026 — the top 0.1%. How they got there.",
        "meta_keywords": kw("OpenAI Buildathon 2026", "top 0.1% global hackathon", "first-year students global competition", "AI Summit 2026", "NIAT Yenepoya achievements"),
    },
    "niat-business-challenge-winning-team-5000-revenue": {
        "title": "How We Made ₹5,000 in a Day and Won Best Marketing Team",
        "meta_title": "How We Made ₹5,000 in a Day at NIAT Yenepoya",
        "meta_description": "Three first-year students ran a food stall and a design service, made ₹5,000 in 24 hours and won Best Marketing Team at the NIAT Business Challenge.",
        "meta_keywords": kw("NIAT Business Challenge", "student entrepreneurship India", "₹5,000 in a day student business", "food stall business challenge", "best marketing team award"),
    },
    "first-year-students-win-national-hackathon-fourth-place": {
        "title": "4th Place at a National Hackathon in Our First Year",
        "meta_title": "4th at Hackwise 2.0: A First-Year Hackathon Story",
        # Report said "two ... first-years"; the article never gives the team size.
        "meta_description": "A 24-hour national SaaS hackathon with a ₹60,000 prize pool, a room full of final-year students, and a team of NIAT Yenepoya first-years finishing fourth.",
        "meta_keywords": kw("Hackwise 2.0", "national SaaS hackathon India", "24-hour hackathon first year", "KVG College of Engineering Sullia", "student hackathon prize pool"),
    },
    "first-year-students-international-hackathon-top-ranking": {
        "title": "Top 69 Out of 15,000+ Teams, in Our First Year",
        # The article counts 15,000+ participants, not teams; the Russian
        # universities are named as partners, not as competitors.
        "meta_title": "Top 69 of 15,000+: The GO-BRICS Energy-O-Thon",
        "meta_description": "NIAT Yenepoya first-years finished in the top 69 teams out of 15,000+ participants at the GO-BRICS Energy-O-Thon, an India–Russia bilateral hackathon.",
        "meta_keywords": kw("GO-BRICS Energy-O-Thon", "international hackathon for Indian students", "BRICS student competition", "top 69 of 15,000", "India Russia student hackathon"),
    },
    "student-media-head-openloop-hackathon-yenepoya-mangalore": {
        "title": "From Applicant to Media Head: Bringing OPENLOOP to Life",
        "meta_title": "Media Head for OPENLOOP: A NIAT Yenepoya Story",
        "meta_description": "How a first-year student became Media and Graphics Head for OPENLOOP, a national hackathon expecting 300 to 600 participants, and what he designed.",
        "meta_keywords": kw("OPENLOOP hackathon Yenepoya", "student media and graphics head", "organising a national hackathon", "design for campus events", "NIAT Yenepoya leadership roles"),
    },
    "ai-tools-mentoring-niat-tech-club-student-experience": {
        "title": "How I Mentored Students on AI Tools at NIAT Tech Club",
        "meta_title": "Mentoring Students on AI Tools at NIAT Tech Club",
        "meta_description": "A student mentor at NIAT Yenepoya's Tech Club on the session he ran: Google Stitch, Claude Code and AI Studio, prompt engineering and rapid prototyping.",
        "meta_keywords": kw("NIAT Tech Club AI mentoring", "Google Stitch", "Claude Code for students", "Google AI Studio", "prompt engineering workshop India"),
    },
    "best-beaches-parks-near-niat-yenepoya-panambur-tannirbhavi-hangout-spots": {
        "title": "Beaches and Parks Near NIAT Yenepoya: Panambur to Kadri",
        "meta_title": "Beaches and Parks Near NIAT Yenepoya, With Bus Routes",
        "meta_description": "Panambur at 13 km, Tannirbhavi at 16 km, Kadri Park at 10 km, with the bus numbers for each and what every one of them is actually good for.",
        "meta_keywords": kw("beaches near NIAT Yenepoya Mangalore", "Panambur Beach bus route", "Tannirbhavi Beach from Mangalore", "Kadri Park", "things to do in Mangalore for students", "weekend escapes Mangalore"),
    },
    "ethics-accountability-tech-culture-niat-yenepoya-university": {
        "title": "Why Ethics and Accountability Actually Matter in Tech",
        "meta_title": "Ethics and Accountability at NIAT Yenepoya: Real Stories",
        "meta_description": "Writing your own code, owning your bugs and respecting bad ideas. A NIAT Yenepoya student on how tech ethics is actually taught and practised.",
        "meta_keywords": kw("tech ethics for students", "accountability in engineering education", "writing your own code", "code of conduct NIAT Yenepoya", "owning your bugs"),
    },
}

# ── Anand Mahadev's seven articles: structure fixes only ──────────────────
s = "first-year-ai-app-1000-users-global-reach-hackmate"
b = clean(read(s))
b = replace_once(b, "I built a product that reached 1,000+ users across 10+ countries in its first month. I'm not saying that to brag — a year ago, I wouldn't have believed it was possible either.</p>",
                 "I built a product that reached 1,000+ users across 10+ countries in its first month.</p>")
write(s, b, META[s])

s = "yenepoya-students-openai-buildathon-top-74-global"
b = clean(read(s))
# Pasted summary paragraph, a second copy of the title and the "By:/Category:" line.
b = cut(b, "<p>Some numbers take time to sink in. 75,000+", "<p>Some numbers take time to sink in.</p>")
write(s, b, META[s])

s = "niat-business-challenge-winning-team-5000-revenue"
b = clean(read(s))
b = replace_once(b, "No investor funding. No prior business experience. No safety net. Just three first-year NIAT students, a food stall, some graphic design skills, and one day to prove we could build something from nothing.</p>",
                 "No investor funding. No prior business experience. No safety net.</p>")
write(s, b, META[s])

s = "first-year-students-win-national-hackathon-fourth-place"
b = clean(read(s))
b = replace_once(b, " Yet there we were, at KVG College of Engineering, pulling through a sleepless night and walking away with 4th place at Hackwise 2.0.</p>", "</p>")
write(s, b, META[s])

s = "first-year-students-international-hackathon-top-ranking"
b = clean(read(s))
b = replace_once(b, " We were first year students who finished in the top 69 teams out of more than 15,000 participants at the GO-BRICS Hackathon.</p>", "</p>")
write(s, b, META[s])

s = "student-media-head-openloop-hackathon-yenepoya-mangalore"
b = clean(read(s))
b = cut(b, "<p>Not every milestone in your journey at Yenepoya University", "<p>Not every milestone in your journey looks like")
write(s, b, META[s])

s = "ai-tools-mentoring-niat-tech-club-student-experience"
write(s, clean(read(s)), META[s])

s = "ethics-accountability-tech-culture-niat-yenepoya-university"
write(s, dashes(read(s)), META[s])

# ── Beaches (Anand Mahadev) + Weekend Escapes (vijaykumar92vk) ────────────
s = "best-beaches-parks-near-niat-yenepoya-panambur-tannirbhavi-hangout-spots"
b = dashes(read(s))
b = replace_once(b, "Sometimes you just need that.</p>", """Sometimes you just need that.</p><p class="ni-para">Another student, who ends up there most weekends, describes it like this:</p><blockquote class="ni-quote">I've lost count of how many times I've been to Tannir Bhavi. Honestly, I go there when I need to remember why I even came to Mangalore. The sound of the waves alone changes something in your head — there's no assignment stress, no exam pressure, just the cool breeze and the wide shoreline. The sunsets are what get me every time. The sky turns this slow orange, and you see groups of people just sitting there, walking along the shore, or talking with friends. It's not fancy. It's just real.</blockquote>""")
b = replace_once(b, "no one is watching you or expecting anything from you.</p>", """no one is watching you or expecting anything from you.</p><p class="ni-para">Kadri Park is full of greenery, quiet, and the kind of calm you don't get in the hostel. The small food street nearby is the best part: you can walk around, grab something quick, and just chill. It's not crowded like campus, and nobody's asking you about project deadlines or exam prep.</p>""")
b = replace_once(b, '<div class="ni-highlight">', """<h2 class="ni-h2">Why It Matters After a Long Week</h2><p class="ni-para">After a brutal week of classes and assignments, the best thing you can do for yourself is just step out of campus and breathe. Mangalore has these pockets of peace that are literally 20-30 minutes away. Once you find them, you realise you aren't trapped on campus. You can leave, breathe, and come back ready for the next week.</p><p class="ni-para">These places become the answer to the question every NIAT student asks on Friday: how do I actually survive this week? If you're new to NIAT Mangalore or struggling with the pressure, seriously go to one of these places. Not because it's a tourist thing, but because your mental health needs it, and these spots actually deliver that. No pretense. Just what you need.</p><div class="ni-highlight">""")
b = replace_once(b, "</article>", '<p class="ni-para"><em>This article brings together accounts from two NIAT Yenepoya students, Anand Mahadev and vijaykumar92vk.</em></p></article>')
write(s, b, META[s])
