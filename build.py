#!/usr/bin/env python3
"""
build.py - Merge all topic JSON files into data/resources.json

Usage:
    python3 build.py              # merge all topic files
    python3 build.py --stats      # show stats after merging
    python3 build.py --validate   # validate entries before merging
    python3 build.py --dry-run    # show what would be merged without writing

Each file in data/topics/*.json is a JSON array of resource objects.
This script merges them all, deduplicates by title, and writes data/resources.json.

To add resources incrementally:
  1. Edit or add entries to the relevant file in data/topics/
  2. Run: python3 build.py
  That's it. The website will pick up the new data/resources.json.
"""

import json
import glob
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOPICS_DIR = os.path.join(SCRIPT_DIR, "data", "topics")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "data", "resources.json")

REQUIRED_FIELDS = {"title", "authors", "year", "type", "topic", "url", "description"}
VALID_TYPES = {"paper", "book", "grey_literature"}


def load_topic_files():
    """Load all topic JSON files and return (resources, errors)."""
    all_resources = []
    errors = []
    pattern = os.path.join(TOPICS_DIR, "*.json")
    files = sorted(glob.glob(pattern))

    if not files:
        errors.append(f"No JSON files found in {TOPICS_DIR}")
        return all_resources, errors

    for filepath in files:
        filename = os.path.basename(filepath)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                errors.append(f"{filename}: Expected a JSON array, got {type(data).__name__}")
                continue
            for i, entry in enumerate(data):
                entry["_source_file"] = filename
                entry["_source_index"] = i
            all_resources.extend(data)
        except json.JSONDecodeError as e:
            errors.append(f"{filename}: Invalid JSON - {e}")
        except Exception as e:
            errors.append(f"{filename}: {e}")

    return all_resources, errors


def validate_resources(resources):
    """Validate resource entries. Returns list of warnings."""
    warnings = []
    for r in resources:
        src = f"{r.get('_source_file', '?')}[{r.get('_source_index', '?')}]"
        missing = REQUIRED_FIELDS - set(r.keys())
        if missing:
            warnings.append(f"{src} ({r.get('title', 'untitled')}): missing fields: {missing}")
        if r.get("type") and r["type"] not in VALID_TYPES:
            warnings.append(f"{src} ({r.get('title', 'untitled')}): invalid type '{r['type']}' (expected: {VALID_TYPES})")
    return warnings


def merge_duplicates(resources):
    """Fold entries that share a title into one record, keeping what differs.

    This used to be `deduplicate()`, which kept the first entry under a given
    normalised title and dropped the rest without a word. On 2026-09-23 that
    was 24 of 669 entries, and **every one of the 21 affected titles spanned
    more than one topic**, so what it was actually discarding was a topic
    assignment a curator had made on purpose. "Conditional Cash Transfers:
    Reducing Present and Future Poverty" is filed under both Public Policy &
    Governance and Social Protection; after deduplication it existed only
    under the first, because that file sorts earlier, and a reader filtering
    to Social Protection could not find it. Nothing errored and the count in
    stats.json agreed with itself.

    Eleven of the 21 also carried **different URLs** under the same title,
    usually a working paper and the published version: the NBER PDF of "The
    Miracle of Microfinance?" and J-PAL's evaluation page for it. Dropping one
    lost a real, different link.

    So: one record per title, `topics` carrying every topic it was filed
    under, `alt_urls` carrying the other links. `topic` stays as the first one
    so every consumer that reads a scalar keeps working.
    """
    order = []
    merged = {}
    for r in resources:
        key = r.get("title", "").strip().lower()
        if key not in merged:
            r["topics"] = [r["topic"]] if r.get("topic") else []
            merged[key] = r
            order.append(key)
            continue
        first = merged[key]
        topic = r.get("topic")
        if topic and topic not in first["topics"]:
            first["topics"].append(topic)
        url = r.get("url")
        if url and url != first.get("url"):
            first.setdefault("alt_urls", [])
            if url not in first["alt_urls"]:
                first["alt_urls"].append(url)
        # Prefer the longer description and any DOI the other copy carried.
        if len(r.get("description", "")) > len(first.get("description", "")):
            first["description"] = r["description"]
        if r.get("doi") and not first.get("doi"):
            first["doi"] = r["doi"]
        for tag in r.get("tags", []):
            if tag not in first.setdefault("tags", []):
                first["tags"].append(tag)
        # A link the checker could reach beats one it could not.
        rank = {"ok": 0, "paywalled": 1, "blocked": 2, "unknown": 3, "broken": 4}
        if rank.get(r.get("link_status"), 9) < rank.get(first.get("link_status"), 9):
            first["link_status"] = r["link_status"]
            first["link_checked"] = r.get("link_checked")

    unique = [merged[k] for k in order]
    for r in unique:
        r["topics"] = sorted(r.get("topics") or ([r["topic"]] if r.get("topic") else []))
    folded = len(resources) - len(unique)
    return unique, folded


def clean_resources(resources):
    """Remove internal tracking fields before writing."""
    cleaned = []
    for r in resources:
        entry = {k: v for k, v in r.items() if not k.startswith("_")}
        cleaned.append(entry)
    return cleaned


def print_stats(resources):
    """Print a summary of the merged library."""
    topics = {}
    types = {}
    for r in resources:
        rtype = r.get("type", "unknown")
        types[rtype] = types.get(rtype, 0) + 1
        for topic in (r.get("topics") or [r.get("topic", "Unknown")]):
            topics[topic] = topics.get(topic, 0) + 1

    print(f"\n{'='*50}")
    print(f"  Development Discourses - Library Stats")
    print(f"{'='*50}")
    print(f"  Total resources: {len(resources)}")
    print()
    print("  By type:")
    for t in sorted(types.keys()):
        print(f"    {t:20s} {types[t]:4d}")
    print()
    print("  By topic:")
    for t in sorted(topics.keys()):
        print(f"    {t:40s} {topics[t]:4d}")
    print(f"{'='*50}\n")


def main():
    args = set(sys.argv[1:])
    do_validate = "--validate" in args
    do_stats = "--stats" in args
    dry_run = "--dry-run" in args

    print(f"Loading topic files from {TOPICS_DIR}...")
    resources, errors = load_topic_files()

    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  - {e}")
        if not resources:
            sys.exit(1)

    print(f"Loaded {len(resources)} entries from topic files.")

    if do_validate:
        warnings = validate_resources(resources)
        if warnings:
            print(f"\nValidation warnings ({len(warnings)}):")
            for w in warnings:
                print(f"  - {w}")
        else:
            print("All entries valid.")

    resources, folded = merge_duplicates(resources)
    if folded:
        print(f"Folded {folded} repeated title(s) into their first entry, "
              f"keeping every topic and any differing URL.")

    resources = clean_resources(resources)

    if do_stats or dry_run:
        print_stats(resources)

    if dry_run:
        print("Dry run - no files written.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resources, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(resources)} resources to {OUTPUT_FILE}")

    if "--no-assets" not in args:
        generate_assets(resources)


def generate_assets(resources):
    """Generate derived assets (sitemap, feed, stats...) after a successful build."""
    try:
        import generate_assets as ga
    except Exception as e:  # pragma: no cover - optional step
        print(f"Skipping asset generation ({e}).")
        return

    base_url = ga.resolve_base_url(None)
    print(f"Generating site assets (base URL: {base_url})...")
    ga.write(os.path.join(SCRIPT_DIR, "sitemap.xml"), ga.build_sitemap(resources, base_url), False)
    ga.write(os.path.join(SCRIPT_DIR, "feed.json"),
             json.dumps(ga.build_feed(resources, base_url), indent=2, ensure_ascii=False) + "\n", False)
    ga.write(os.path.join(SCRIPT_DIR, "opensearch.xml"), ga.build_opensearch(base_url), False)
    ga.write(os.path.join(SCRIPT_DIR, "data", "stats.json"),
             json.dumps(ga.build_stats(resources), indent=2, ensure_ascii=False) + "\n", False)
    ga.write(os.path.join(SCRIPT_DIR, "data", "search-index.json"),
             json.dumps(ga.build_search_index(resources), ensure_ascii=False) + "\n", False)


if __name__ == "__main__":
    main()
