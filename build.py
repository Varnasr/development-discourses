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


def deduplicate(resources):
    """Remove duplicates by normalized title. Returns (unique, duplicates_removed)."""
    seen = {}
    unique = []
    dupes = 0
    for r in resources:
        key = r.get("title", "").strip().lower()
        if key in seen:
            dupes += 1
        else:
            seen[key] = True
            unique.append(r)
    return unique, dupes


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
        topic = r.get("topic", "Unknown")
        rtype = r.get("type", "unknown")
        topics[topic] = topics.get(topic, 0) + 1
        types[rtype] = types.get(rtype, 0) + 1

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

    resources, dupes = deduplicate(resources)
    if dupes:
        print(f"Removed {dupes} duplicate(s).")

    resources = clean_resources(resources)

    if do_stats or dry_run:
        print_stats(resources)

    if dry_run:
        print("Dry run - no files written.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resources, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(resources)} resources to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
