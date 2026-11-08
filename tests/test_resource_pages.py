"""Static resource pages: resource/<id>.html, written by resource_pages.py.

The library used to serve one page, resource.html?id=<id>, drawn by script, so
every address had the same raw title and no canonical. These pin what replaced
it: a page per resource, with a distinct title, a canonical equal to its own
address, and nothing from the data able to break out of the markup.
"""
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import generate_assets as ga  # noqa: E402
import resource_pages as rp  # noqa: E402

BASE = "https://devdiscourses.impactmojo.in"
with open(os.path.join(ROOT, "data", "resources.json"), encoding="utf-8") as f:
    RESOURCES = json.load(f)


class Head(HTMLParser):
    """Collects the head tags and the text of the elements the tests look at."""

    def __init__(self):
        super().__init__()
        self.title = ""
        self.meta = {}
        self.canonical = []
        self.ld = ""
        self._in = None
        self.text = {}
        self._id = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in = "title"
        elif tag == "meta":
            self.meta[a.get("name") or a.get("property")] = a.get("content")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical.append(a.get("href"))
        elif tag == "script" and a.get("type") == "application/ld+json":
            self._in = "ld"
        if a.get("id"):
            self._id = a["id"]

    def handle_endtag(self, tag):
        if tag in ("title", "script"):
            self._in = None
        self._id = None

    def handle_data(self, data):
        if self._in == "title":
            self.title += data
        elif self._in == "ld":
            self.ld += data
        elif self._id:
            self.text[self._id] = self.text.get(self._id, "") + data


def parse(html):
    p = Head()
    p.feed(html)
    return p


def pages():
    return rp.build_pages(RESOURCES, BASE)


def test_every_resource_has_a_page_on_disk_and_in_the_build():
    built = pages()
    assert len(built) == len(RESOURCES)
    for r in RESOURCES:
        rel = rp.page_path(r["id"])
        assert rel in built
        assert os.path.exists(os.path.join(ROOT, rel)), f"{rel} missing: run make build"
    on_disk = {n for n in os.listdir(os.path.join(ROOT, "resource")) if n.endswith(".html")}
    assert on_disk == {os.path.basename(p) for p in built}, "stale pages in resource/"


def test_committed_pages_equal_the_build():
    for rel, html in pages().items():
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            assert f.read() == html, f"{rel} is stale: run make build"


def test_titles_are_distinct_and_about_65_characters():
    titles = [parse(h).title for h in pages().values()]
    assert len(set(titles)) == len(titles)
    assert all(t.endswith(" | Development Discourses") for t in titles)
    assert max(len(t) for t in titles) <= 65


def test_canonical_is_the_pages_own_address_and_only_one():
    for rel, html in pages().items():
        p = parse(html)
        assert p.canonical == [f"{BASE}/{rel}"], rel
        assert p.meta["og:url"] == f"{BASE}/{rel}"


def test_description_is_the_resources_own_text_cut_at_a_sentence():
    for r in RESOURCES:
        d = rp.make_description(r)
        full = " ".join(r["description"].split())
        assert len(d) <= rp.DESC_MAX
        assert full.startswith(d) or d.endswith("…")
        if full.startswith(d) and d != full:
            assert d[-1] in ".!?"
        assert parse(rp.render_page(r, BASE)).meta["description"] == d


def test_share_tags_and_jsonld_are_present():
    r = RESOURCES[0]
    p = parse(rp.render_page(r, BASE))
    assert p.meta["og:image"] == f"{BASE}/icon.svg"
    assert p.meta["twitter:title"] == r["title"]
    ld = json.loads(p.ld)
    assert ld["name"] == r["title"] and ld["mainEntityOfPage"].endswith(f"/resource/{r['id']}.html")


def test_visible_content_is_in_the_html_without_script():
    for r in RESOURCES[:60]:
        html = rp.render_page(r, BASE)
        p = parse(html)
        assert p.text["detailTitle"] == r["title"]
        assert p.text["detailDescription"] == r["description"]
        assert p.text["detailAuthors"] == (r.get("authors") or "Unknown")
        assert f'href="{r["url"]}"' in html.replace("&amp;", "&")
        for t in r.get("topics") or [r["topic"]]:
            assert t in html.replace("&amp;", "&")
        assert "Loading..." not in html.split("relatedList")[0]
        assert p.text["breadcrumbTitle"] == r["title"]


def test_every_topic_of_a_multi_topic_resource_is_listed():
    multi = [r for r in RESOURCES if len(r.get("topics") or []) > 1]
    assert multi, "fixture assumption: some resources sit under several topics"
    for r in multi:
        links = re.findall(r'class="detail-topic-tag" href="\.\./index.html\?topic=[^"]*">([^<]*)</a>',
                           rp.render_page(r, BASE))
        assert [l.replace("&amp;", "&") for l in links] == r["topics"]


def test_alt_urls_are_linked():
    alt = [r for r in RESOURCES if r.get("alt_urls")]
    assert alt
    html = rp.render_page(alt[0], BASE)
    for u in alt[0]["alt_urls"]:
        assert escape_amp(u) in html


def escape_amp(u):
    from html import escape
    return escape(u, quote=True)


NASTY = {
    "id": "nasty-1",
    "title": 'A <b>"bold"</b> & \'odd\' title </script><script>alert(1)</script>',
    "authors": 'Smith & Jones <x>, "Q"',
    "year": 2020,
    "type": "paper",
    "topic": "Law & Order <x>",
    "topics": ["Law & Order <x>", 'Say "hi"'],
    "url": "https://example.org/a?x=1&y=2\"onmouseover=\"alert(1)",
    "alt_urls": ["https://example.org/b?p=1&q=<2>"],
    "description": 'First & foremost <script>x</script>. "Quoted" text. ' + "More words here. " * 20,
    "access_type": "open_access",
    "tags": ["a&b", "<tag>"],
    "link_status": "broken",
    "link_checked": "2026-11-01",
}


def test_markup_in_titles_and_descriptions_is_escaped():
    html = rp.render_page(NASTY, BASE)
    assert "<script>alert(1)" not in html
    assert "</script><script>" not in html
    assert "<b>" not in html and "<x>" not in html and "<tag>" not in html
    p = parse(html)
    # Entities decode back to the original text in every place it appears.
    assert p.title.startswith("A <b>\"bold\"</b> & 'odd' title")
    assert p.meta["og:title"] == NASTY["title"]
    assert p.text["detailTitle"] == NASTY["title"]
    assert p.meta["description"].startswith("First & foremost <script>x</script>.")
    assert 'onmouseover="alert' not in html
    # The inert JSON-LD block still parses and holds the original strings.
    assert json.loads(p.ld)["name"] == NASTY["title"]
    # Exactly one JSON-LD script, one canonical.
    assert html.count('application/ld+json') == 1
    assert p.canonical == [f"{BASE}/resource/nasty-1.html"]


def test_pages_use_root_relative_assets_one_level_down():
    html = rp.render_page(RESOURCES[0], BASE)
    assert 'href="../css/style.css"' in html
    assert 'src="../js/resource.js"' in html
    assert "register('../service-worker.js')" in html
    assert 'data-root="../"' in html and 'data-static="1"' in html


def test_sitemap_and_feed_use_the_static_addresses():
    sitemap = ga.build_sitemap(RESOURCES, BASE)
    locs = re.findall(r"<loc>([^<]*)</loc>", sitemap)
    assert len(locs) == len(RESOURCES) + 1
    assert set(locs[1:]) == {rp.page_url(BASE, r["id"]) for r in RESOURCES}
    feed = ga.build_feed(RESOURCES, BASE)
    for item in feed["items"]:
        assert "/resource/" in item["url"]
        assert "resource.html?id=" in item["id"]  # ids stay as they were


def test_old_address_still_exists_and_the_script_points_its_canonical_at_the_page():
    assert os.path.exists(os.path.join(ROOT, "resource.html"))
    with open(os.path.join(ROOT, "js", "resource.js"), encoding="utf-8") as f:
        js = f.read()
    assert "'/resource/' + encodeURIComponent(r.id) + '.html'" in js
    assert "if (IS_STATIC) return;" in js
