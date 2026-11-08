#!/usr/bin/env python3
"""resource_pages.py - one static page per resource, written from data/resources.json.

Each page is resource.html with its head and its visible content filled in, so
a crawler or a reader with no script gets the title, authors, summary, topics
and the link out. js/resource.js then enhances the same markup (citations,
related resources, connection map), so the static page IS the resource page.

Output: resource/<id>.html, one per resource. Stale files are removed.

The template is resource.html itself. Every substitution below must match
exactly once, so a change to resource.html that breaks one fails the build
loudly instead of shipping a page with the old placeholder in it.
"""
from __future__ import annotations

import json
import os
import re
from html import escape
from typing import Any

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(SCRIPT_DIR, "resource.html")
OUT_DIR = os.path.join(SCRIPT_DIR, "resource")
SITE_NAME = "Development Discourses"
TITLE_MAX = 65
DESC_MAX = 160

TYPE_LABEL = {"grey_literature": "Grey Lit"}
ACCESS_LABEL = {
    "open_access": "Open Access",
    "free_to_read": "Free to Read",
    "check_access": "Check Access",
}
LINK_COPY = {
    "ok": ("link-ok", "Link checked"),
    "paywalled": ("link-warn", "Publisher landing page"),
    "blocked": ("link-warn", "Not confirmed from here"),
    "unknown": ("link-warn", "Did not answer"),
    "broken": ("link-bad", "Link was unreachable"),
}
# Mirrors LINK_DETAIL in js/resource.js.
LINK_DETAIL = {
    "paywalled": "This host answers with a publisher landing page. The text may be "
                 "open access behind it, but the library cannot confirm that from here. "
                 "Last checked {date}.",
    "blocked": "This publisher refuses automated requests, so the library could not "
               "check the link on {date}. That is not a sign the document is gone: "
               "it will almost certainly open in your browser.",
    "unknown": "The host did not answer when the library checked on {date}. "
               "Usually temporary. Worth trying.",
    "broken": 'This link returned "not found" when the library checked on {date}. '
              "The document has probably moved. The search links below may find it.",
}


def page_path(rid: str) -> str:
    return f"resource/{rid}.html"


def page_url(base_url: str, rid: str) -> str:
    return f"{base_url}/{page_path(rid)}"


def topics_of(r: dict) -> list[str]:
    return list(r.get("topics") or ([r["topic"]] if r.get("topic") else []))


def type_label(r: dict) -> str:
    t = r.get("type") or "paper"
    return TYPE_LABEL.get(t, t.capitalize())


def make_title(r: dict) -> str:
    """Resource title plus the site name, kept to about TITLE_MAX characters."""
    suffix = f" | {SITE_NAME}"
    title = " ".join((r.get("title") or "Untitled").split())
    room = TITLE_MAX - len(suffix)
    if len(title) <= room:
        return title + suffix
    cut = title[: room - 1].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return cut + "…" + suffix


def _elide_middle(title: str, room: int) -> str:
    """Keep the start and the end of a long title, for titles that only differ late."""
    head_len = room // 2 - 1
    tail_len = room - head_len - 1
    head = title[:head_len].rsplit(" ", 1)[0].rstrip(" ,;:-")
    tail = title[-tail_len:]
    tail = tail.split(" ", 1)[1] if " " in tail and title[-tail_len - 1] != " " else tail
    return f"{head}\u2026 {tail.lstrip()}"


def assign_titles(resources: list[dict]) -> dict[str, str]:
    """Every resource's page title, all different.

    Cutting long titles to fit makes some of them collide ("The State of Food
    Security and\u2026" for the 2023 and 2024 editions). A colliding group keeps
    the start and the end of the title instead, which is where such titles
    differ. If that still collides the full title is used, over length, because
    a distinct title matters more than the length.
    """
    suffix = f" | {SITE_NAME}"
    room = TITLE_MAX - len(suffix)
    titles = {r["id"]: make_title(r) for r in resources if r.get("id")}
    by_title: dict[str, list[dict]] = {}
    for r in resources:
        if r.get("id"):
            by_title.setdefault(titles[r["id"]], []).append(r)
    for group in by_title.values():
        if len(group) < 2:
            continue
        for r in group:
            full = " ".join((r.get("title") or "Untitled").split())
            titles[r["id"]] = _elide_middle(full, room) + suffix
    seen: dict[str, int] = {}
    for t in titles.values():
        seen[t] = seen.get(t, 0) + 1
    for r in resources:
        rid = r.get("id")
        if rid and seen[titles[rid]] > 1:
            full = " ".join((r.get("title") or "Untitled").split())
            titles[rid] = full + suffix
    return titles


def make_description(r: dict) -> str:
    """The resource's own description, cut at a sentence boundary."""
    text = " ".join((r.get("description") or "").split())
    if not text:
        return f"{r.get('title', 'Resource')}, in the {SITE_NAME} library."
    if len(text) <= DESC_MAX:
        return text
    sentences = re.split(r"(?<=[.!?])\s+", text)
    out = ""
    for s in sentences:
        candidate = (out + " " + s).strip()
        if len(candidate) > DESC_MAX:
            break
        out = candidate
    if out:
        return out
    # The first sentence alone is too long: cut at a word and say so.
    return text[: DESC_MAX - 1].rsplit(" ", 1)[0].rstrip(" ,;:-") + "…"


def json_ld(r: dict, url: str) -> str:
    schema = "Book" if r.get("type") == "book" else (
        "Report" if r.get("type") == "grey_literature" else "ScholarlyArticle")
    ld: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": schema,
        "name": r["title"],
        "headline": r["title"],
        "author": [{"@type": "Organization", "name": a}
                   for a in re.split(r",\s*", r.get("authors") or "Unknown")],
        "url": r.get("url"),
        "mainEntityOfPage": url,
        "about": r.get("topic"),
        "isAccessibleForFree": r.get("access_type") in ("open_access", "free_to_read"),
        "isPartOf": {"@type": "CollectionPage", "name": SITE_NAME},
    }
    if r.get("year"):
        ld["datePublished"] = str(r["year"])
    if r.get("description"):
        ld["description"] = r["description"]
    if r.get("tags"):
        ld["keywords"] = ", ".join(r["tags"])
    if r.get("doi"):
        ld["identifier"] = "https://doi.org/" + r["doi"]
    body = json.dumps(ld, ensure_ascii=False)
    # Keep the block inert inside HTML whatever the data holds.
    body = body.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return body


# ---- template helpers ----

def _sub_once(html: str, old: str, new: str) -> str:
    if html.count(old) != 1:
        raise RuntimeError(f"resource.html template changed: expected exactly one {old[:60]!r}")
    return html.replace(old, new)


def _open_tag(html: str, rid: str) -> re.Match:
    m = re.search(r'<(\w+)([^>]*\bid="%s"[^>]*)>' % re.escape(rid), html)
    if not m:
        raise RuntimeError(f"resource.html template changed: no element id={rid!r}")
    return m


def set_inner(html: str, rid: str, inner: str, unhide: bool = False) -> str:
    m = _open_tag(html, rid)
    tag = m.group(1)
    end = html.index(f"</{tag}>", m.end())
    open_tag = m.group(0)
    if unhide:
        open_tag = re.sub(r"\s+hidden(?=[\s>])", "", open_tag)
    return html[: m.start()] + open_tag + inner + html[end:]


def set_attr(html: str, rid: str, attr: str, value: str) -> str:
    m = _open_tag(html, rid)
    tag = m.group(0)
    v = escape(value, quote=True)
    if re.search(r'\s%s="[^"]*"' % attr, tag):
        new = re.sub(r'(\s%s=")[^"]*(")' % attr, lambda mm: mm.group(1) + v + mm.group(2), tag)
    else:
        new = tag[:-1] + f' {attr}="{v}">'
    return html[: m.start()] + new + html[m.end():]


def load_template() -> str:
    with open(TEMPLATE, "r", encoding="utf-8") as f:
        return f.read()


def _to_root_relative(html: str) -> str:
    """The pages live one level down, so relative links gain '../'."""
    def fix(m: re.Match) -> str:
        attr, val = m.group(1), m.group(2)
        if re.match(r"(https?:|mailto:|#|\.\./|/|data:)", val):
            return m.group(0)
        return f'{attr}="../{val}"'
    html = re.sub(r'\b(href|src)="([^"]*)"', fix, html)
    return _sub_once(html, "register('service-worker.js')", "register('../service-worker.js')")


def render_page(r: dict, base_url: str, template: str | None = None,
                title: str | None = None) -> str:
    html = template if template is not None else load_template()
    esc = lambda s: escape(str(s), quote=True)  # noqa: E731
    rid = r["id"]
    url = page_url(base_url, rid)
    title = title or make_title(r)
    desc = make_description(r)
    topics = topics_of(r)

    head = (
        f'<link rel="canonical" href="{esc(url)}">\n'
        f'    <meta property="og:type" content="article">\n'
        f'    <meta property="og:site_name" content="ImpactMojo">\n'
        f'    <meta property="og:title" content="{esc(r["title"])}">\n'
        f'    <meta property="og:description" content="{esc(desc)}">\n'
        f'    <meta property="og:url" content="{esc(url)}">\n'
        f'    <meta property="og:image" content="{esc(base_url)}/icon.svg">\n'
        f'    <meta name="twitter:card" content="summary">\n'
        f'    <meta name="twitter:title" content="{esc(r["title"])}">\n'
        f'    <meta name="twitter:description" content="{esc(desc)}">\n'
        f'    <script type="application/ld+json" id="resource-jsonld">{json_ld(r, url)}</script>'
    )
    html = _sub_once(html, "<title>Resource | Development Discourses</title>",
                     f"<title>{esc(title)}</title>")
    html = _sub_once(html, '<meta name="description" content="Development Discourses resource detail page.">',
                     f'<meta name="description" content="{esc(desc)}">')
    og_start = html.index("<!-- Open Graph")
    og_end = html.index('<meta name="twitter:card" content="summary">') + len('<meta name="twitter:card" content="summary">')
    html = html[:og_start] + head + html[og_end:]

    html = _sub_once(html, "<body>", f'<body data-root="../" data-resource-id="{esc(rid)}" data-static="1">')

    # Visible content.
    html = set_inner(html, "breadcrumbTopic", esc(r.get("topic") or ""))
    html = set_inner(html, "breadcrumbTitle", esc(r["title"]))
    html = set_inner(html, "typeBadge", esc(type_label(r)))
    html = set_attr(html, "typeBadge", "class", "resource-type-badge " + (r.get("type") or "paper"))
    access = r.get("access_type") or "check_access"
    html = set_inner(html, "accessBadge", esc(ACCESS_LABEL.get(access, "Unknown")))
    html = set_attr(html, "accessBadge", "class", f"access-badge access-{access}")

    status = r.get("link_status")
    if status in LINK_COPY:
        cls, label = LINK_COPY[status]
        when = r.get("link_checked") or "an earlier run"
        html = set_inner(html, "linkBadge", esc(label), unhide=True)
        html = set_attr(html, "linkBadge", "class", "link-badge " + cls)
        if status != "ok":
            note = "<p>" + esc(LINK_DETAIL[status].replace("{date}", when)) + "</p>"
            html = set_inner(html, "linkNote", note, unhide=True)
            html = set_attr(html, "linkNote", "class", "link-note " + cls)

    html = set_inner(html, "detailTitle", esc(r["title"]))
    html = set_inner(html, "detailAuthors", esc(r.get("authors") or "Unknown"))
    html = set_inner(html, "detailYear", esc(r.get("year") or ""))
    html = set_inner(html, "detailTopic", "".join(
        f'<a class="detail-topic-tag" href="index.html?topic={esc(quote(t))}">{esc(t)}</a>'
        for t in topics))
    html = set_inner(html, "detailDescription", esc(r.get("description") or "No description available."))
    html = set_attr(html, "readSourceBtn", "href", r["url"])

    alts = r.get("alt_urls") or []
    if alts:
        items = "".join(
            f'<li><a href="{esc(u)}" target="_blank" rel="noopener">{esc(_pretty_url(u))}</a></li>'
            for u in alts)
        html = set_inner(html, "altUrls",
                         f'<h3 class="alt-urls-title">Also available at</h3><ul>{items}</ul>', unhide=True)

    tags = r.get("tags") or []
    if tags:
        html = set_inner(html, "tagList", "".join(
            f'<a href="index.html?search={esc(quote(t.replace("-", " ")))}" class="detail-tag">{esc(t)}</a>'
            for t in tags))
    else:
        html = set_attr(html, "detailTags", "style", "display:none")

    meta = [("Authors", r.get("authors") or "Unknown"), ("Year", r.get("year") or "N/A"),
            ("Type", "Grey Literature" if r.get("type") == "grey_literature" else (r.get("type") or "paper").capitalize()),
            ("Topic", r.get("topic") or "")]
    rows = "".join(f'<div class="meta-item"><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in meta)
    if r.get("doi"):
        rows += (f'<div class="meta-item"><dt>DOI</dt><dd><a href="https://doi.org/{esc(r["doi"])}" '
                 f'target="_blank" rel="noopener">{esc(r["doi"])}</a></dd></div>')
    rows += f'<div class="meta-item"><dt>Access</dt><dd>{esc(ACCESS_LABEL.get(access, "Unknown"))}</dd></div>'
    rows += (f'<div class="meta-item"><dt>Source</dt><dd><a href="{esc(r["url"])}" target="_blank" '
             f'rel="noopener">{esc(_domain(r["url"]))}</a></dd></div>')
    html = set_inner(html, "metaList", rows)

    return _to_root_relative(html)


def quote(s: str) -> str:
    from urllib.parse import quote as q
    return q(s, safe="")


def _domain(u: str) -> str:
    from urllib.parse import urlparse
    host = urlparse(u).hostname or u
    return host[4:] if host.startswith("www.") else host


def _pretty_url(u: str) -> str:
    from urllib.parse import urlparse
    p = urlparse(u)
    if not p.hostname:
        return u
    host = p.hostname[4:] if p.hostname.startswith("www.") else p.hostname
    return host + (p.path if len(p.path) > 1 else "")


def build_pages(resources: list[dict], base_url: str) -> dict[str, str]:
    """Map of file name (resource/<id>.html) to page HTML."""
    template = load_template()
    titles = assign_titles(resources)
    return {page_path(r["id"]): render_page(r, base_url, template, titles[r["id"]])
            for r in resources if r.get("id")}


def write_pages(resources: list[dict], base_url: str, dry_run: bool = False) -> int:
    pages = build_pages(resources, base_url)
    if dry_run:
        print(f"  would write {len(pages)} pages in resource/")
        return len(pages)
    os.makedirs(OUT_DIR, exist_ok=True)
    keep = {os.path.basename(p) for p in pages}
    for name in os.listdir(OUT_DIR):
        if name.endswith(".html") and name not in keep:
            os.remove(os.path.join(OUT_DIR, name))
    for rel, content in pages.items():
        path = os.path.join(SCRIPT_DIR, rel)
        old = None
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                old = f.read()
        if old != content:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
    print(f"  wrote {len(pages)} pages in resource/")
    return len(pages)
