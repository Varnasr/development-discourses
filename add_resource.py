#!/usr/bin/env python3
"""
add_resource.py - Add one or more resources to a topic file.

Usage:
    # Interactive mode - prompts for each field:
    python3 add_resource.py

    # Add from a JSON file containing an array of entries:
    python3 add_resource.py --from-file new_entries.json --topic livelihoods_resources.json

    # Add a single entry via CLI args:
    python3 add_resource.py --topic livelihoods_resources.json \\
        --title "Paper Title" \\
        --authors "Author Name" \\
        --year 2024 \\
        --type paper \\
        --topic-name "Livelihoods" \\
        --url "https://example.com/paper" \\
        --description "Description of the paper."

After adding, run `python3 build.py` to regenerate data/resources.json.
"""

import json
import os
import sys
import argparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOPICS_DIR = os.path.join(SCRIPT_DIR, "data", "topics")


def list_topic_files():
    """List available topic files."""
    files = sorted(f for f in os.listdir(TOPICS_DIR) if f.endswith(".json"))
    return files


def load_topic_file(filename):
    """Load a topic file, return the list."""
    path = os.path.join(TOPICS_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_topic_file(filename, data):
    """Save entries back to a topic file."""
    path = os.path.join(TOPICS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(data)} entries to {path}")


def interactive_add():
    """Interactively add a resource."""
    files = list_topic_files()
    if not files:
        print("No topic files found. Create one first.")
        return

    print("\nAvailable topic files:")
    for i, f in enumerate(files, 1):
        data = load_topic_file(f)
        print(f"  {i}. {f} ({len(data)} entries)")

    choice = input("\nSelect topic file (number): ").strip()
    try:
        filename = files[int(choice) - 1]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    data = load_topic_file(filename)
    # Infer the topic name from existing entries
    default_topic = data[0]["topic"] if data else ""

    print(f"\nAdding to {filename} (topic: {default_topic})")
    print("Enter resource details (or 'q' to quit):\n")

    while True:
        title = input("Title: ").strip()
        if title.lower() == 'q':
            break

        # Check for duplicates
        if any(r["title"].strip().lower() == title.lower() for r in data):
            print(f"  '{title}' already exists in this file. Skipping.")
            continue

        authors = input("Authors: ").strip()
        year_str = input("Year: ").strip()
        try:
            year = int(year_str) if year_str else None
        except ValueError:
            year = None

        rtype = input("Type (paper/book/grey_literature) [paper]: ").strip() or "paper"
        topic_name = input(f"Topic [{default_topic}]: ").strip() or default_topic
        url = input("URL: ").strip()
        description = input("Description: ").strip()

        entry = {
            "title": title,
            "authors": authors,
            "year": year,
            "type": rtype,
            "topic": topic_name,
            "url": url,
            "description": description,
        }

        data.append(entry)
        print(f"  Added. ({len(data)} entries now)\n")

    save_topic_file(filename, data)
    print("\nDon't forget to run: python3 build.py")


def batch_add(topic_filename, entries):
    """Add multiple entries from a list."""
    data = load_topic_file(topic_filename)
    existing_titles = {r["title"].strip().lower() for r in data}
    added = 0
    skipped = 0

    for entry in entries:
        if entry.get("title", "").strip().lower() in existing_titles:
            print(f"  Skipping duplicate: {entry.get('title', '?')}")
            skipped += 1
        else:
            data.append(entry)
            existing_titles.add(entry["title"].strip().lower())
            added += 1

    save_topic_file(topic_filename, data)
    print(f"Added {added}, skipped {skipped} duplicates.")


def main():
    parser = argparse.ArgumentParser(description="Add resources to a topic file")
    parser.add_argument("--from-file", help="JSON file with array of entries to add")
    parser.add_argument("--topic", help="Target topic filename (e.g., livelihoods_resources.json)")
    parser.add_argument("--title", help="Resource title")
    parser.add_argument("--authors", help="Authors")
    parser.add_argument("--year", type=int, help="Year")
    parser.add_argument("--type", dest="rtype", choices=["paper", "book", "grey_literature"], default="paper")
    parser.add_argument("--topic-name", help="Topic label (e.g., 'Livelihoods')")
    parser.add_argument("--url", help="URL")
    parser.add_argument("--description", help="Description")

    args = parser.parse_args()

    # Batch mode from file
    if args.from_file:
        if not args.topic:
            print("--topic is required with --from-file")
            sys.exit(1)
        with open(args.from_file, "r", encoding="utf-8") as f:
            entries = json.load(f)
        batch_add(args.topic, entries)
        return

    # Single entry via CLI
    if args.title:
        if not args.topic:
            print("--topic is required for CLI mode")
            sys.exit(1)
        entry = {
            "title": args.title,
            "authors": args.authors or "",
            "year": args.year,
            "type": args.rtype,
            "topic": args.topic_name or "",
            "url": args.url or "",
            "description": args.description or "",
        }
        batch_add(args.topic, [entry])
        return

    # Interactive mode
    interactive_add()


if __name__ == "__main__":
    main()
