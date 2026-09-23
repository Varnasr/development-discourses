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
    # `topics` and `link_status` are omitted per-record when absent, so the
    # index rows are a subset of the keep list rather than exactly it.
    assert set(index[0]) <= {"id", "title", "authors", "year", "topic", "topics",
                             "type", "access_type", "link_status"}
    assert {"id", "title", "type"} <= set(index[0])


# ---------------------------------------------------------------------------
# Merging, not dropping
#
# build.py used to keep the first entry under a given normalised title and
# discard the rest silently. On 2026-09-23 that was 24 of 669 entries, and all
# 21 affected titles spanned more than one topic, so what it discarded was a
# curator's topic assignment. These tests pin the behaviour that replaced it.
# ---------------------------------------------------------------------------

def test_merge_keeps_every_topic_a_title_was_filed_under():
    import build  # noqa: E402

    entries = [
        {"title": "Conditional Cash Transfers", "topic": "Social Protection",
         "url": "https://example.org/cct", "description": "short"},
        {"title": "conditional cash transfers", "topic": "Public Policy & Governance",
         "url": "https://example.org/cct", "description": "a longer description"},
    ]
    merged, folded = build.merge_duplicates(entries)
    assert folded == 1
    assert len(merged) == 1
    assert merged[0]["topics"] == ["Public Policy & Governance", "Social Protection"]
    # The scalar survives for anything that reads one.
    assert merged[0]["topic"] == "Social Protection"
    # The longer description wins, so folding does not lose prose either.
    assert merged[0]["description"] == "a longer description"


def test_merge_keeps_a_differing_url_rather_than_dropping_it():
    import build  # noqa: E402

    entries = [
        {"title": "The Miracle of Microfinance?", "topic": "Development Economics",
         "url": "https://www.nber.org/w18950.pdf", "description": ""},
        {"title": "The Miracle of Microfinance?", "topic": "Financial Inclusion",
         "url": "https://www.povertyactionlab.org/evaluation/hyderabad", "description": ""},
    ]
    merged, _ = build.merge_duplicates(entries)
    assert merged[0]["alt_urls"] == ["https://www.povertyactionlab.org/evaluation/hyderabad"]


def test_merge_prefers_a_link_the_checker_could_reach():
    import build  # noqa: E402

    entries = [
        {"title": "X", "topic": "A", "url": "https://a.example/x", "description": "",
         "link_status": "broken", "link_checked": "2026-09-23"},
        {"title": "X", "topic": "B", "url": "https://b.example/x", "description": "",
         "link_status": "ok", "link_checked": "2026-09-23"},
    ]
    merged, _ = build.merge_duplicates(entries)
    assert merged[0]["link_status"] == "ok"


def test_topic_counts_span_every_topic_not_just_the_first():
    import generate_assets as ga  # noqa: E402

    data = [{"title": "X", "topic": "A", "topics": ["A", "B"], "type": "paper",
             "access_type": "open_access", "year": 2020}]
    stats = ga.build_stats(data)
    assert stats["by_topic"] == {"A": 1, "B": 1}


# ---------------------------------------------------------------------------
# Link status
#
# The previous `verified` boolean was reset to False by enrich_data.py on every
# build, so resource.html's "Verified" badge was unreachable code. These pin
# that the replacement is not reset the same way, and that the classification
# keeps a publisher refusing a robot apart from a document that is gone.
# ---------------------------------------------------------------------------

VALID_LINK_STATES = {"ok", "paywalled", "blocked", "unknown", "broken"}


def test_link_status_values_are_from_the_known_set():
    for path in _topic_files():
        for entry in _load(path):
            state = entry.get("link_status")
            if state is not None:
                assert state in VALID_LINK_STATES, f"{path}: unknown link_status {state!r}"


def test_the_legacy_verified_flag_is_gone():
    for path in _topic_files():
        for entry in _load(path):
            assert "verified" not in entry, (
                f"{path}: `verified` is back. It was removed because enrich_data.py "
                "reset it to False on every build, which made the badge that read it "
                "unreachable. Use link_status."
            )


def test_a_blocked_link_is_not_recorded_as_broken():
    import verify_urls  # noqa: E402

    assert 403 in verify_urls.BLOCKED_CODES
    assert 403 not in verify_urls.BROKEN_CODES
    assert 404 in verify_urls.BROKEN_CODES
