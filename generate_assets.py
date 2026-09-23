#!/usr/bin/env python3
"""generate_assets.py - Generate derived site assets from data/resources.json.

Produces:
  - sitemap.xml            search-engine sitemap (home + every resource page)
  - feed.json              JSON Feed 1.1 of the most recently added resources
  - opensearch.xml         OpenSearch descriptor for browser search integration
  - data/stats.json        aggregate counts consumed by the frontend / badges
  - data/search-index.json trimmed index (id, title, authors, year, topic(s), type)

Usage:
    python3 generate_assets.py
    python3 generate_assets.py --base-url https://example.org/dev-discourses
    python3 generate_assets.py --dry-run

Base URL resolution order: --base-url flag > SITE_BASE_URL env var > default.
"""
from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from html import escape
from typing import Any

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, "data", "resources.json")
DEFAULT_BASE_URL = "https://varnasr.github.io/development-discourses"
FEED_ITEMS = 50


def load_resources() -> list[dict[str, Any]]:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_base_url(cli_value: str | None) -> str:
    base = cli_value or os.environ.get("SITE_BASE_URL") or DEFAULT_BASE_URL
    return base.rstrip("/")


# ---- sitemap.xml ----

def build_sitemap(resources: list[dict], base_url: str) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    lines.append(f"  <url><loc>{escape(base_url)}/index.html</loc><priority>1.0</priority></url>")
    for r in resources:
        rid = r.get("id")
        if not rid:
            continue
        loc = f"{base_url}/resource.html?id={escape(rid)}"
        lines.append(f"  <url><loc>{loc}</loc><priority>0.6</priority></url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


# ---- feed.json (JSON Feed 1.1) ----

def build_feed(resources: list[dict], base_url: str) -> dict:
    # Most recent by year, then title, capped at FEED_ITEMS.
    ordered = sorted(
        resources,
        key=lambda r: (r.get("year") or 0, r.get("title", "")),
        reverse=True,
    )[:FEED_ITEMS]

    items = []
    for r in ordered:
        rid = r.get("id")
        url = f"{base_url}/resource.html?id={rid}" if rid else r.get("url", "")
        items.append({
            "id": url,
            "url": url,
            "external_url": r.get("url", ""),
            "title": r.get("title", "Untitled"),
            "content_text": r.get("description", ""),
            "authors": [{"name": r.get("authors", "Unknown")}],
            "tags": ([r.get("topic")] if r.get("topic") else []) + (r.get("tags") or []),
        })

    return {
        "version": "https://jsonfeed.org/version/1.1",
        "title": "Development Discourses",
        "home_page_url": f"{base_url}/index.html",
        "feed_url": f"{base_url}/feed.json",
        "description": "A curated open-access library of research papers, books, and grey literature for development practitioners in South Asia.",
        "language": "en",
        "items": items,
    }


# ---- opensearch.xml ----

def build_opensearch(base_url: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Dev Discourses</ShortName>
  <Description>Search the Development Discourses open-access library</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Url type="text/html" method="get" template="{escape(base_url)}/index.html?q={{searchTerms}}"/>
  <moreurl>{escape(base_url)}/index.html</moreurl>
</OpenSearchDescription>
"""


# ---- stats.json ----

def build_stats(resources: list[dict]) -> dict:
    types = Counter(r.get("type", "unknown") for r in resources)
    # Counted across `topics`, not the scalar `topic`. A resource filed under
    # two topics is in both filters, so it has to be in both counts or the
    # pill beside the filter disagrees with the list the filter returns.
    topics = Counter(t for r in resources
                     for t in (r.get("topics") or [r.get("topic", "Unknown")]))
    access = Counter(r.get("access_type", "check_access") for r in resources)
    years = [r.get("year") for r in resources if r.get("year")]
    return {
        "total": len(resources),
        "by_type": dict(sorted(types.items())),
        "by_topic": dict(sorted(topics.items())),
        "by_access": dict(sorted(access.items())),
        "topic_count": len(topics),
        "year_min": min(years) if years else None,
        "year_max": max(years) if years else None,
    }


# ---- search-index.json ----

def build_search_index(resources: list[dict]) -> list[dict]:
    keep = ("id", "title", "authors", "year", "topic", "topics", "type",
            "access_type", "link_status")
    return [{k: r.get(k) for k in keep if r.get(k) is not None} for r in resources]


def write(path: str, content: str, dry_run: bool) -> None:
    rel = os.path.relpath(path, SCRIPT_DIR)
    if dry_run:
        print(f"  would write {rel} ({len(content)} bytes)")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  wrote {rel}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate derived site assets.")
    parser.add_argument("--base-url", help="Canonical base URL for the deployed site")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    base_url = resolve_base_url(args.base_url)
    resources = load_resources()
    print(f"Loaded {len(resources)} resources. Base URL: {base_url}")

    write(os.path.join(SCRIPT_DIR, "sitemap.xml"),
          build_sitemap(resources, base_url), args.dry_run)
    write(os.path.join(SCRIPT_DIR, "feed.json"),
          json.dumps(build_feed(resources, base_url), indent=2, ensure_ascii=False) + "\n",
          args.dry_run)
    write(os.path.join(SCRIPT_DIR, "opensearch.xml"),
          build_opensearch(base_url), args.dry_run)
    write(os.path.join(SCRIPT_DIR, "data", "stats.json"),
          json.dumps(build_stats(resources), indent=2, ensure_ascii=False) + "\n",
          args.dry_run)
    write(os.path.join(SCRIPT_DIR, "data", "search-index.json"),
          json.dumps(build_search_index(resources), ensure_ascii=False) + "\n",
          args.dry_run)

    print("Done." if not args.dry_run else "Dry run complete.")


if __name__ == "__main__":
    main()
