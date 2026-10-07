#!/usr/bin/env python3
"""Turn an SEO report (one "# ARTICLE n" section per article) into
article-content/<slug>.html and <slug>.meta.json, transferring the report's
text as written.

  python3 article-content/reports/convert.py <report.md> <n>...   # article numbers

Mapping: "#### H2: X" -> <h2>, "##### H3: X" -> <h3>, **bold** -> <strong>,
*italic* -> <em>, "- item" -> <ul><li>, "> text" -> <blockquote>, "---" -> <hr>,
a Markdown table -> <table>, "**FAQs**" -> <h2>Frequently Asked Questions</h2>,
"**Qn. ...**" -> <h3>, the lines after it -> <p>. Removed: *(Editor: ...)*
notes, *( ... )* notes on their own line, and > 🚨 / ⚠️ / ✅ callouts.
Prints anything it could not map so it can be skipped instead of guessed.
"""
import html
import json
import os
import re
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CALLOUT = re.compile(r"^>\s*(🚨|⚠️|⚠|✅)")


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)", r'<a href="\2">\1</a>', s)
    return s


def section(text, n):
    m = re.search(rf"^### {n}\.[^\n]*\n(.*?)(?=^### \d+\.|\Z)", text, re.M | re.S)
    return m.group(1) if m else None


def overrides_for(report_name, n):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "overrides.json")
    data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    return data.get(report_name, {}).get(str(n), {})


def apply_faq_overrides(sec, ov, problems):
    """Drop or replace whole FAQ entries ("**Qn. ...**" plus the lines up to the next blank line)."""
    for qn in ov.get("faq_drop", []):
        sec, k = re.subn(rf"^\*\*{qn}\.[^\n]*\*\*\n(?:[^\n]+\n?)*\n?", "", sec, flags=re.M)
        if k != 1:
            problems.append(f"faq_drop {qn}: matched {k} entries")
    for qn, rep in ov.get("faq_replace", {}).items():
        sec, k = re.subn(rf"^\*\*{qn}\.[^\n]*\*\*\n(?:[^\n]+\n?)*", lambda m: f"**{rep['q']}**\n{rep['a']}\n", sec, flags=re.M)
        if k != 1:
            problems.append(f"faq_replace {qn}: matched {k} entries")
    return sec


def edited_body(slug):
    """An edited body in reports/edited/<slug>.md (same Markdown as section 5) replaces the report's."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "edited", f"{slug}.md")
    return open(path, encoding="utf-8").read() if os.path.exists(path) else None


def labelled(sec, label):
    """Text on the line after "**<label> ...:**" (e.g. Meta title (54 chars):)."""
    m = re.search(rf"^\*\*{label}[^*\n]*:\*\*\s*\n([^\n]+)", sec, re.M)
    return m.group(1).strip() if m else None


def body_html(sec, problems):
    lines = sec.split("\n")
    out, para, lst, quote, table = [], [], None, [], []

    def flush():
        nonlocal para, lst, quote, table
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
        if lst:
            out.append(f"<{lst[0]}>" + "".join(f"<li>{inline(i)}</li>" for i in lst[1]) + f"</{lst[0]}>")
        if quote:
            out.append("<blockquote><p>" + inline(" ".join(quote)) + "</p></blockquote>")
        if table:
            rows = [[c.strip() for c in r.strip().strip("|").split("|")] for r in table if not re.match(r"^\|[\s|:-]+\|$", r.strip())]
            head, rest = rows[0], rows[1:]
            out.append(
                "<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rest)
                + "</tbody></table>"
            )
        para, lst, quote, table = [], None, [], []

    in_callout = False
    for raw in lines:
        line = raw.strip()
        # Editor notes are removed wherever they sit; a line left empty by that is dropped.
        line = re.sub(r"\s*\*\(Editor:.*?\)\*", "", line).strip()
        if raw.strip() and not line:
            continue
        if CALLOUT.match(line):
            in_callout = True
            continue
        if in_callout and line.startswith(">"):
            continue
        in_callout = False
        if not line:
            flush()
            continue
        if re.fullmatch(r"\*\([^)]*\)\*", line) or re.fullmatch(r"\*\(.*\)\*", line):
            flush()  # report note on its own line, e.g. *(The live page already has ...)*
            continue
        h = re.match(r"^(#{4,5}) H([23]):\s*(.+)$", line)
        q = re.match(r"^\*\*(Q\d+\..+?)\*\*$", line)
        if h:
            flush()
            out.append(f"<h{h.group(2)}>{inline(h.group(3))}</h{h.group(2)}>")
        elif line.startswith("#"):
            flush()
            problems.append(f"unmapped heading: {line[:80]}")
        elif line == "**FAQs**":
            flush()
            out.append("<h2>Frequently Asked Questions</h2>")
        elif q:
            flush()
            out.append(f"<h3>{inline(q.group(1))}</h3>")
        elif line == "---":
            flush()
            out.append("<hr>")
        elif line.startswith(">"):
            if para or lst or table:
                flush()
            quote.append(line.lstrip(">").strip())
        elif line.startswith("|"):
            if para or lst or quote:
                flush()
            table.append(line)
        elif re.match(r"^[-*] ", line) or re.match(r"^\d+[.)] ", line):
            tag = "ul" if re.match(r"^[-*] ", line) else "ol"
            if para or quote or table or (lst and lst[0] != tag):
                flush()
            if not lst:
                lst = (tag, [])
            lst[1].append(re.sub(r"^([-*]|\d+[.)]) ", "", line))
        else:
            if lst or quote or table:
                flush()
            # An FAQ answer starts on the line right after its question.
            para.append(line)
            if out and out[-1].startswith("<h3>Q"):
                flush()
    flush()
    result = "\n".join(out)
    for leftover in ["**", "](", "Editor:", "🚨", "⚠", "✅", "H2:", "H3:"]:
        if leftover in result:
            problems.append(f"left in body: {leftover!r}")
    return result


def convert(text, n, report_name=None):
    parts = re.split(r"^# ARTICLE (\d+)\s*$", text, flags=re.M)
    arts = {parts[i]: parts[i + 1] for i in range(1, len(parts), 2)}
    a = arts.get(str(n))
    if a is None:
        return None, [f"no ARTICLE {n}"]
    problems, notes = [], []
    s1, s3, s4, s5, s6 = (section(a, k) for k in (1, 3, 4, 5, 6))
    url = re.search(r"https?://\S+?(?=`|\s|$)", s1 or "")
    if not url:
        return None, ["no URL in section 1"]
    url = url.group(0)
    slug = url.rstrip("/").split("/")[-1]
    meta = {
        "title": labelled(s4 or "", "H1"),
        "meta_title": labelled(s3 or "", "Meta title"),
        "meta_description": labelled(s3 or "", "Meta description"),
    }
    for k, sec_label in [("meta_title", "Meta title"), ("meta_description", "Meta description")]:
        declared = re.search(rf"\*\*{sec_label} \((\d+) chars\)", s3 or "")
        if meta[k] and declared and int(declared.group(1)) != len(meta[k]):
            notes.append(f"{k}: report label says {declared.group(1)} chars, text is {len(meta[k])}")
    prim = re.search(r"^\*\*Primary:\*\*\s*(.+)$", s6 or "", re.M)
    sec = re.search(r"^\*\*Secondary:\*\*\s*(.+)$", s6 or "", re.M)
    if prim and sec:
        kws = [prim.group(1)] + re.split(r"\s+·\s+", sec.group(1))
        meta["meta_keywords"] = [k.strip().lower() for k in kws if k.strip()]
    else:
        meta["meta_keywords"] = None
    for k, v in meta.items():
        if not v:
            problems.append(f"missing {k}")
    if not s5:
        return None, problems + ["no section 5 body"]
    ov = overrides_for(report_name, n) if report_name else {}
    for k, v in ov.get("meta", {}).items():
        notes.append(f"{k} from overrides.json")
        meta[k] = v
    s5 = apply_faq_overrides(s5, ov, problems)
    edited = edited_body(slug)
    if edited is not None:
        notes.append("body from reports/edited/ (approved edit, not the report text)")
        s5 = edited
    body = body_html(s5, problems)
    return {"n": n, "url": url, "slug": slug, "meta": meta, "body": body, "notes": notes}, problems


if __name__ == "__main__":
    report = open(sys.argv[1], encoding="utf-8").read()
    for n in sys.argv[2:]:
        art, problems = convert(report, n, os.path.basename(sys.argv[1]))
        if art is None:
            print(f"ARTICLE {n}: SKIP ({'; '.join(problems)})")
            continue
        status = "SKIP" if problems else "ok"
        print(f"ARTICLE {n}: {status} {art['slug']}" + (f"  ({'; '.join(problems)})" if problems else ""))
        if problems:
            continue
        with open(os.path.join(OUT, f"{art['slug']}.html"), "w", encoding="utf-8") as f:
            f.write(art["body"] + "\n")
        with open(os.path.join(OUT, f"{art['slug']}.meta.json"), "w", encoding="utf-8") as f:
            json.dump(art["meta"], f, ensure_ascii=False, indent=2)
            f.write("\n")
