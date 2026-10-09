#!/usr/bin/env python3
"""Put three NSRIT articles into the site's article template (ni-article),
text unchanged. Rushikonda and Simhachalam were plain <div> text with their
headings and lists typed as ordinary lines; the tech-ethics article was a
chat-app paste with h3 section headings and the app's classes.

  python3 article-content/reports/nsrit_format.py
"""
import html
import os
import re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CARD = re.compile(r'<div class="article-image-card">[\s\S]*?</div>\s*</div>')


def esc(t):
    return html.escape(t, quote=False)


def blocks(body):
    body = CARD.sub("", body)
    out = []
    for part in re.split(r"</?div[^>]*>", body):
        t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", part))).strip()
        if t:
            out.append(t)
    return out


def template(bs):
    """Short lines with no end punctuation are headings; short lines after a
    line ending in ':' are list items. The opening 'Introduction' label goes:
    the first paragraph is the introduction."""
    html_out, i, first = [], 0, True
    while i < len(bs):
        t = bs[i]
        if t.endswith(":"):
            html_out.append(f'<p class="ni-para">{esc(t)}</p>')
            items = []
            while i + 1 < len(bs) and len(bs[i + 1].split()) <= 12 and not bs[i + 1].endswith(":"):
                i += 1
                items.append(f'<li class="ni-list-item">{esc(bs[i])}</li>')
            html_out.append('<ul class="ni-list">' + "".join(items) + "</ul>")
        elif len(t.split()) <= 7 and not re.search(r"[.!?:”\"]$", t):
            if not (first and t.lower() == "introduction"):
                html_out.append(f'<h2 class="ni-h2">{esc(t)}</h2>')
        elif first:
            html_out.append(f'<p class="ni-intro">{esc(t)}</p>')
            first = False
        else:
            html_out.append(f'<p class="ni-para">{esc(t)}</p>')
        i += 1
    return '<article class="ni-article">' + "".join(html_out) + "</article>"


def chat_paste(body):
    body = re.sub(r'\sclass="(?!article-image-card)[^"]*"', "", body)
    body = re.sub(r"<(/?)h3\b", r"<\1h2", body)
    body = re.sub(r"<h2>\s*<strong>(.*?)</strong>\s*</h2>", r"<h2>\1</h2>", body)
    return re.sub(r"(>[^<]*)", lambda m: m.group(1).replace("--", "—"), body)


for slug, fix in [
    ("rushikonda-beach-the-stress-buster-of-nsrit-students-4b1a9c71", lambda b: template(blocks(b))),
    ("simhachalam-temple-the-pride-of-andhra-pradesh-9ba8cb5f", lambda b: template(blocks(b))),
    ("what-niat-actually-taught-me-about-tech-ethics-and-why-it-stuck-754f63df", chat_paste),
]:
    p = os.path.join(OUT, f"{slug}.html")
    body = open(p, encoding="utf-8").read()
    open(p, "w", encoding="utf-8").write(fix(body).strip() + "\n")
    print("formatted", slug)
