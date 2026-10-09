#!/usr/bin/env python3
"""Build the NIAT SGU Kolhapur articles from the live bodies + the SEO report.

The report has no bodies (its author could not fetch the text), so bodies
come from the live articles: unchanged apart from formatting fixes ("--" to
an em dash, a broken link, NSGC expanded once) for the 13 kept as they are,
and merged in the students' own words where the duplicate audit merges
pages. Metadata comes from the report, with three corrections noted inline.

  python3 article-content/reports/sgu_build.py <live.json> <meta.json>
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from convert import body_html  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
live = json.load(open(sys.argv[1], encoding="utf-8"))
meta = json.load(open(sys.argv[2], encoding="utf-8"))

# Report meta titles cut off mid-phrase, and one detail that drifted from the source.
meta["30-days-content-creator-niat-campus-life-sgu-hostel-reality"]["meta_title"] = "Hostel Life Is Not Instagram: 30 Days at NIAT Kolhapur"
meta["building-ai-projects-beats-theory-genai-masterclass-niat-sgu"]["meta_title"] = "GenAI Masterclass at NIAT Kolhapur: Projects Over Theory"
fq = "funniest-question-project-presentation-story"
meta[fq]["meta_description"] = meta[fq]["meta_description"].replace("two seconds of silence", "2–3 seconds of silence")


def fix_text(html):
    """Formatting only: '--' to an em dash in text (not in tags or URLs)."""
    return re.sub(r"(>[^<]*)", lambda m: m.group(1).replace("--", "—"), html)


def write(slug, body, m):
    with open(os.path.join(OUT, f"{slug}.html"), "w", encoding="utf-8") as f:
        f.write(body.strip() + "\n")
    fields = {k: m[k] for k in ("title", "meta_title", "meta_description", "meta_keywords") if m.get(k)}
    json.dump(fields, open(os.path.join(OUT, f"{slug}.meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("built", slug)


def md(text):
    problems = []
    out = body_html(text, problems)
    assert not problems, problems
    return out


def insert_before(html, marker, snippet):
    i = html.find(marker)
    assert i >= 0, marker[:60]
    return html[:i] + snippet + html[i:]


# ── 13 kept with their own body (formatting fixes only) ─────────────────────
KEEP = [
    "niat-sanjay-ghodawat-university-first-day-campus-experience",
    "niat-sanjay-ghodawat-university-first-day-campus-life",
    "niat-sanjay-ghodawat-university-first-week-campus-life",
    "niat-sanjay-ghodawat-university-first-week-exam-campus-life",
    "niat-sanjay-ghodawat-university-first-week-btech-life",
    "niat-sanjay-ghodawat-university-first-year-daily-life-honest",
    "niat-sanjay-ghodawat-university-first-year-practical-skills-honest-review",
    "first-year-niat-sgu-kolhapur-honest-student-review",
    "funniest-question-project-presentation-story",
    "nervous-first-day-student-nsgc-president-niat-sgu",
    "first-year-btech-ai-python-real-skills-niat-sgu",
    "building-ai-projects-beats-theory-genai-masterclass-niat-sgu",
]
for slug in KEEP:
    body = fix_text(live[slug]["body"])
    if slug == "nervous-first-day-student-nsgc-president-niat-sgu":
        # Spell NSGC out once, at its first use in the text.
        body = re.sub(r"(>[^<]*?)\bNSGC\b", r"\1NSGC (NIAT Student General Council)", body, count=1)
    write(slug, body, meta[slug])

# ── Stall article + the VR team's own account of the 48-hour challenge ─────
stall = "niat-sanjay-ghodawat-university-student-stall-entrepreneurship-club-experience"
body = fix_text(live[stall]["body"]).replace('_Xlpizf2nwu6GPwS""', '_Xlpizf2nwu6GPwS"')
body = insert_before(body, '<h2 class="ni-h2">What Actually Made Money', """<h2 class="ni-h2">The 48-Hour Profit Challenge, From Behind the VR Stall</h2>
 <p class="ni-para">The event was the 48-hour profit challenge, and it turned the whole campus into a buzzing marketplace. One of the students who ran the VR stall described it from their side:</p>
 <blockquote class="ni-quote">In the beginning, many students passing by did not really understand what Virtual Reality actually was. Some were curious, while others looked confused about how it worked. That was the moment we understood that creating an innovative idea is only half the work — the real challenge is convincing people to try it and understand its value.</blockquote>
 <p class="ni-para">They started talking to students personally, explaining how the VR headset works and how they could experience games and virtual environments in a completely different way. Once one student tried it, they quickly called their friends to experience it too, and the stall became one of the busiest spots on campus, with students waiting for their turn.</p>
 <p class="ni-para">Selling a common snack or drink would have been easier, because everyone already understands it. Promoting a new technology took confidence, communication, patience and creativity: explaining, demonstrating and convincing people, over and over. That, in their words, is real entrepreneurship — not just earning money, but creating curiosity, solving problems and making people believe in an idea.</p>

 """)
write(stall, body, meta[stall])

# ── Robotic arm workshop + the wider workshop programme ───────────────────
arm = "virtual-robotic-arm-workshop-control-systems-simulation-niat-sgu"
body = fix_text(live[arm]["body"])
body = insert_before(body, '<h2 class="ni-h2">What Changed for Me', """<h2 class="ni-h2">The Wider Workshop Programme</h2>
<p class="ni-para">The robotic arm session is part of a wider set of workshops. Another student's account of the programme at NIAT SGU:</p>
<ul class="ni-list">
<li class="ni-list-item">Regular workshops are conducted on topics like IoT and robotics, and they help students understand concepts beyond textbooks.</li>
<li class="ni-list-item">Lectures are recorded, so students can catch up any time.</li>
<li class="ni-list-item">Practice sessions are also conducted to strengthen understanding.</li>
</ul>
<p class="ni-para">There is scope for improvement too: some workshops feel more theoretical than practical, and a few sessions can be complex and difficult to follow. More focus on hands-on learning and simpler explanations would make the experience even better — which is exactly why a session like the robotic arm workshop stands out.</p>
""")
write(arm, body, meta[arm])

# ── Content-creator article + the same author's first-30-days tips ─────────
cc = "30-days-content-creator-niat-campus-life-sgu-hostel-reality"
body = fix_text(live[cc]["body"])
body = insert_before(body, '<h2 class="ni-h2">Why I Started Documenting This', """<h2 class="ni-h2">The Challenges, and What I Would Tell a New Student</h2>
<p class="ni-para">Let's be real — it's not easy. In the first month you might struggle initially, feel pressure from deadlines, and take time to adjust. There are daily tasks, assignments and practice work, and if you delay, it piles up quickly. You'll also be surrounded by students who are serious about their careers, and seeing others work hard automatically pushes you to improve.</p>
<p class="ni-para">If you're joining, here is what I'd tell you:</p>
<ul class="ni-list">
<li class="ni-list-item">Start early</li>
<li class="ni-list-item">Stay consistent</li>
<li class="ni-list-item">Ask doubts</li>
<li class="ni-list-item">Focus on understanding</li>
<li class="ni-list-item">Build something on your own</li>
</ul>
<p class="ni-para">NIAT won't change your life automatically — but if you put in the effort, it can help you build one.</p>
""")
write(cc, body, meta[cc])

# ── Campus: Sahyadri Hills article + the facilities list (new structure) ───
camp = "niat-kolhapur-campus-sahyadri-hills-student-review"
write(camp, md("""Tucked into the lush landscape of Kolhapur, Maharashtra, NIAT — the NxtWave Institute of Advanced Technologies — stands as one of the most breathtaking academic campuses in the Deccan. Sprawling across a magnificent 165 acres, the campus isn't just large — it's alive. Every path winds through greenery, every window frames a hill, and every morning begins with the gentle soundtrack of nature.

#### H2: A Campus Kissed by the Sahyadri Hills

NIAT's campus sits at the foothills of the majestic Sahyadri mountain range — a UNESCO World Heritage biodiversity hotspot. These ancient hills don't merely serve as a backdrop; they are an ever-present companion. Morning fog rolls in from their peaks, evenings paint them gold, and during monsoon, they erupt in a thousand shades of emerald. Students here study with one of the most awe-inspiring natural canvases in all of India just outside their windows.

#### H2: Monsoon — The Campus at Its Most Magical

When the rains arrive, NIAT Kolhapur transforms into something out of a dream. The entire 165-acre campus turns an intense, saturated green. Waterfalls cascade down the Sahyadri ridgelines in the distance. The air fills with petrichor — that irreplaceable scent of earth meeting rain. Walking between classes becomes a sensory journey; the mist, the sound of rainfall on leaves, the dramatic cloud-wrapped hills — it is simply stunning. Rainy season at NIAT is not just weather. It is an experience.

#### H2: 165 Acres of Living, Breathing Green

The campus is wild in the best possible way. Ancient trees line the internal roads. Birds you'd normally only see in nature reserves call NIAT home. Every corner becomes a vignette in the monsoon: a moss-covered wall here, a stream flowing alongside a path there, reflections of the Sahyadri shimmering in newly formed puddles. Students often describe rainy season evenings at NIAT as indescribably peaceful — the kind of calm that sharpens the mind and makes you feel genuinely present.

Another student describes it the same way: unlike typical tech campuses, it does not give a very strict or heavy technical vibe; it feels calm and pleasant, which makes it a great place for students who prefer a peaceful environment to study and live. There is also a pond located behind the mess, with a water fountain, which adds to the beauty of the campus. It’s a nice place to relax and spend some quiet time.

#### H2: What Is Actually on Campus

For daily needs:

- **A mini supermarket**, where students can buy regular items and even food
- **A food court** to hang out and eat

For sports and fitness:

- **A cricket stadium**
- **A football ground**
- **A basketball court**
- **A swimming pool**
- **A gym**
- **Horse riding**, which is something unique and not commonly found in many colleges

#### H2: Academic Excellence at Its Core

NIAT Kolhapur does not let its scenic beauty distract from its core mission: producing graduates ready to lead. The institute is known for its hands-on approach to learning, industry-connected curriculum, committed faculty, and a culture of intellectual curiosity. Students here speak of something rare — the ability to step out of a library into a hillside view, to have a study break that looks like a postcard. The environment doesn't compete with academics. It amplifies them. There's something about learning in a place this beautiful that makes ideas come faster and memory stick longer.

#### H2: A Place That Changes You

Whether you arrive in the gold of autumn, the drama of monsoon, or the crisp clarity of winter — NIAT Kolhapur greets you with something extraordinary. It is more than a campus. It is a place where the mountains teach you as much as the classrooms do. A place that, once experienced, is never forgotten.

Overall, the campus is not just big but also very well-maintained and student-friendly. If someone is looking for a college with a green, calm and peaceful environment, this campus is definitely a good choice.

*This article brings together accounts from two students, Adepu Nishanth and Charani Reddy.*

**FAQs**

**Q1. How big is the NIAT Kolhapur campus?**
165 acres, at the foothills of the Sahyadri range in Kolhapur, Maharashtra.

**Q2. What sports facilities does the campus have?**
A cricket stadium, football ground, basketball court, swimming pool and gym, and horse riding.

**Q3. Is there a shop on campus?**
Yes. A mini supermarket sells regular items and food, and there is a food court.

**Q4. What is the campus like in the monsoon?**
Intensely green, with waterfalls visible on the Sahyadri ridgelines and mist over the hills.
"""), meta[camp])

# ── Clubs: the clubs overview + the art swap + Pitch The Worst Idea ────────
clubs = "niat-clubs-student-life-activities-campus"
write(clubs, md("""Student life at NIAT Kolhapur is quite active and engaging, mainly because of the club system. There are **7 different clubs**, and each club organizes **at least one event every month**. That gives students many chances to participate, explore their interests and try new things beyond academics.

#### H2: Running the Arts Club

I am the Arts Club President and Co-Cultural Head, and this role has been a very good experience for me. Being part of the organizing team and conducting events has helped me become more responsible and improved my management and teamwork skills.

So far, we have had different cultural activities and contests, such as:

- **GRIT Reel Contest**
- **Women’s Day Short Film Contest**
- **A Content Creators Lab workshop**, which got postponed due to low participation and may happen later

These activities help students express their creativity and build confidence.

#### H2: The Art Swap: 47 Registrations, 24 Artworks

At first, the art swap sounded simple — draw something, swap it, and complete it. Once it actually started, it became way more interesting than expected.

You begin with your own idea and your own style, and everything feels under your control. Then suddenly you hand it over to someone else. That moment changes everything: now you're trying to understand what the other person was thinking. Sometimes you continue their idea; sometimes you twist it into something new.

No two pieces were the same. Each one had a mix of two different minds, which made them more creative and unpredictable. The environment was relaxed, interactive and full of energy — people talking, laughing and helping each other. With **47 registrations and 24 final artworks**, people were clearly genuinely interested and involved, and the event was managed smoothly, from explaining the concept to handling the swap and completion.

It wasn't just about art. It was about:

- Letting go of control
- Trusting someone else with your idea
- Building something together

In the end it didn't feel like just an event. It felt like a shared creative moment — and honestly, that's what made it memorable.

#### H2: Pitch The Worst Idea: 30+ People, 5 Teams

'Pitch The Worst Idea' sounded like just another fun activity. It turned out to be way more than that.

Instead of people trying to impress with perfect ideas, everyone came up with the most random, funny and completely impractical ideas — and presented them confidently, as if they actually made sense. There was no pressure to be right and no fear of being judged.

With **around 30+ people and 5 teams pitching**, the room felt alive. Some ideas were hilarious, some were so weird they actually became creative, and some just made everyone laugh non-stop. The Q&A didn't feel serious at all; people reacted and playfully roasted the ideas, and that somehow made the presenters even more confident.

Speaking in front of others usually feels stressful. Here, because everything was already bad on purpose, no one was afraid. Sometimes, removing pressure brings out the best in people. Only one thing though: if more people had been there, the energy would have been insane. Even so, the event did what it was supposed to do. It made people laugh, it made people speak, and it made people comfortable with their ideas.

**Conclusion**

Overall, clubs play a very important role in making college life more enjoyable and in helping students grow in different areas — from organizing an event to handing your drawing to a stranger or pitching a terrible idea with a straight face.

*This article brings together accounts from Charani Reddy, Arts Club President and Co-Cultural Head, and Lavin Pattnaik.*

**FAQs**

**Q1. How many clubs does NIAT Kolhapur have?**
Seven, and each one organizes at least one event every month.

**Q2. What events have the clubs run?**
The GRIT Reel Contest, a Women’s Day Short Film Contest, an art swap and Pitch The Worst Idea, among others.

**Q3. How many people took part in the art swap?**
47 registrations, and 24 final artworks were completed.

**Q4. What is Pitch The Worst Idea?**
An event where teams pitch deliberately bad ideas as if they made sense. Around 30+ people attended and 5 teams pitched.

**Q5. Does every event go ahead?**
No. A planned Content Creators Lab workshop was postponed because of low participation and may happen later.
"""), meta[clubs])
