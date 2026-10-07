#!/usr/bin/env python3
"""Check that article-content/<slug>.html says exactly what the report's
section 5 says, word for word, after the removals convert.py makes.

  python3 article-content/reports/verify.py <report.md> <n>...
"""
import html, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from convert import convert, section, CALLOUT

def words(s):
    return re.findall(r"[^\s]+", s)

def expected(sec):
    keep, in_callout = [], False
    for raw in sec.split("\n"):
        l = re.sub(r"\s*\*\(Editor:.*?\)\*", "", raw.strip()).strip()
        if CALLOUT.match(l): in_callout = True; continue
        if in_callout and l.startswith(">"): continue
        in_callout = False
        if re.fullmatch(r"\*\(.*\)\*", l) or l == "---" or re.match(r"^\|[\s|:-]+\|$", l): continue
        if l == "**FAQs**": l = "Frequently Asked Questions"
        l = re.sub(r"^#{4,5} H[23]:\s*", "", l)
        l = re.sub(r"^([-*]|\d+[.)]|>)\s+", "", l)
        l = l.replace("|", " ").replace("**", "")
        l = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"\1", l)
        keep.append(l)
    return words(" ".join(keep))

def actual(h):
    t = re.sub(r"</?(strong|em|a)\b[^>]*>", "", h)
    t = re.sub(r"<[^>]+>", " ", t)
    return words(html.unescape(t))

report = open(sys.argv[1], encoding="utf-8").read()
parts = re.split(r"^# ARTICLE (\d+)\s*$", report, flags=re.M)
arts = {parts[i]: parts[i + 1] for i in range(1, len(parts), 2)}
for n in sys.argv[2:]:
    art, _ = convert(report, n)
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", f"{art['slug']}.html")
    a, e = actual(open(path, encoding="utf-8").read()), expected(section(arts[n], 5))
    if a == e:
        print(f"ARTICLE {n}: body matches the report word for word ({len(a)} words)")
    else:
        i = next((k for k in range(min(len(a), len(e))) if a[k] != e[k]), min(len(a), len(e)))
        print(f"ARTICLE {n}: MISMATCH at word {i}: file {a[i:i+8]} vs report {e[i:i+8]}")
