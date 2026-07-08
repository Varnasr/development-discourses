"""Data-integrity tests for the Development Discourses library.

Run with:  python3 -m pytest -q
"""
import glob
import json
import os

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOPICS_DIR = os.path.join(ROOT, "data", "topics")
RESOURCES = os.path.join(ROOT, "data", "resources.json")

REQUIRED_FIELDS = {"title", "authors", "year", "type", "topic", "url", "description"}
VALID_TYPES = {"paper", "book", "grey_literature"}
VALID_ACCESS = {"open_access", "free_to_read", "check_access"}


def _topic_files():
    return sorted(glob.glob(os.path.join(TOPICS_DIR, "*.json")))


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.parametrize("path", _topic_files(), ids=os.path.basename)
def test_topic_file_is_array_of_valid_entries(path):
    data = _load(path)
    assert isinstance(data, list) and data, f"{path} must be a non-empty array"
    for entry in data:
        missing = REQUIRED_FIELDS - set(entry)
        assert not missing, f"{entry.get('title', '?')} missing {missing}"
        assert entry["type"] in VALID_TYPES, f"bad type: {entry['type']}"
        assert entry["url"].startswith("http"), f"bad url: {entry['url']}"


def test_resources_json_exists_and_parses():
    assert os.path.exists(RESOURCES), "run build.py to generate resources.json"
    data = _load(RESOURCES)
    assert isinstance(data, list)
    assert len(data) > 400


def test_resource_ids_are_unique():
    data = _load(RESOURCES)
    ids = [r["id"] for r in data if r.get("id")]
    assert len(ids) == len(set(ids)), "duplicate resource ids found"


def test_every_resource_has_access_type():
    data = _load(RESOURCES)
    for r in data:
        assert r.get("access_type") in VALID_ACCESS, r.get("title")


def test_no_duplicate_titles_in_merged_output():
    data = _load(RESOURCES)
    titles = [r["title"].strip().lower() for r in data]
    assert len(titles) == len(set(titles)), "duplicate titles in resources.json"


def test_asset_generation_functions():
    import generate_assets as ga  # noqa: E402

    data = _load(RESOURCES)
    base = "https://example.org/dd"

    sitemap = ga.build_sitemap(data, base)
    assert sitemap.startswith("<?xml")
    assert "resource.html?id=" in sitemap

    feed = ga.build_feed(data, base)
    assert feed["version"].startswith("https://jsonfeed.org")
    assert feed["items"], "feed should contain items"

    stats = ga.build_stats(data)
    assert stats["total"] == len(data)
    assert set(stats["by_type"]) <= VALID_TYPES

    index = ga.build_search_index(data)
    assert len(index) == len(data)
    assert set(index[0]) == {"id", "title", "authors", "year", "topic", "type", "access_type"}
