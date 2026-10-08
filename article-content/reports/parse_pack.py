#!/usr/bin/env python3
"""Turn the NSRIT editorial pack (one "# Entry NN" per article, copy under
"## Article copy starts below") into article-content/<slug>.html and
<slug>.meta.json, using convert.py's Markdown-to-HTML so the output matches
the other reports.

  python3 article-content/reports/parse_pack.py <pack.md> list        # one line per entry
  python3 article-content/reports/parse_pack.py <pack.md> build NN... # write the files

The H1 and "By <author>" lines are dropped (the page renders both). meta.json
carries title (Recommended H1), meta_title and meta_description; keywords are
left unchanged because the pack's keyphrases are inferred, not researched.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from convert import body_html  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def entries(text):
    parts = re.split(r"^# Entry (\d+): .*$", text, flags=re.M)
    return {parts[i]: parts[i + 1] for i in range(1, len(parts), 2)}


def field(e, name):
    m = re.search(rf"^\*\*{re.escape(name)}[^*]*:\*\*\s*(.+)$", e, re.M)
    return m.group(1).strip() if m else None


def copy_markdown(e):
    i = e.find("## Article copy starts below")
    if i < 0:
        return None
    lines = e[i:].split("\n")[1:]
    out, started = [], False
    for line in lines:
        if not started and (line.startswith("# ") or line.startswith("By ") or not line.strip()):
            continue
        started = True
        out.append(line)
    md = "\n".join(out).rstrip()
    md = re.sub(r"\n---\s*$", "", md).rstrip()
    return md


def to_report_markdown(md):
    """## / ### headings into the report convention convert.py understands."""
    lines = []
    for line in md.split("\n"):
        if line.startswith("### "):
            line = "##### H3: " + line[4:]
        elif line.startswith("## "):
            line = "#### H2: " + line[3:]
        lines.append(line)
    return "\n".join(lines)


def entry_info(n, e):
    dest = field(e, "Retrieved destination") or ""
    return {
        "n": n,
        "status": field(e, "Status"),
        "slug": dest.rstrip("/").split("/")[-1],
        "campus": dest.split("niatinsider.com/")[-1].split("/")[0] if "niatinsider.com/" in dest else "",
        "submitted": re.sub(r".*\((https?://[^)]+)\).*", r"\1", field(e, "Submitted URL") or ""),
        "meta": {
            "title": field(e, "Recommended H1"),
            "meta_title": field(e, "Recommended meta title"),
            "meta_description": field(e, "Recommended meta description"),
        },
        "md": copy_markdown(e),
    }


if __name__ == "__main__":
    text = open(sys.argv[1], encoding="utf-8").read()
    es = entries(text)
    if sys.argv[2] == "list":
        for n, e in es.items():
            d = entry_info(n, e)
            words = len(re.sub(r"[#*_>|-]", " ", d["md"] or "").split())
            print(f"{n}\t{d['status']}\t{d['campus']}\t{d['slug']}\t{words}\t{d['submitted'].split('/')[-1]}")
    elif sys.argv[2] == "build":
        for n in sys.argv[3:]:
            d = entry_info(n.zfill(2), es[n.zfill(2)])
            problems = []
            html = body_html(to_report_markdown(d["md"]), problems)
            if problems or any(not v for v in d["meta"].values()):
                print(f"ENTRY {n}: SKIP {d['slug']} ({'; '.join(problems) or 'missing meta'})")
                continue
            open(os.path.join(OUT, f"{d['slug']}.html"), "w", encoding="utf-8").write(html + "\n")
            json.dump(d["meta"], open(os.path.join(OUT, f"{d['slug']}.meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            print(f"ENTRY {n}: ok {d['slug']}")
