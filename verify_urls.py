#!/usr/bin/env python3
"""
verify_urls.py - Check all resource URLs for accessibility.

Checks each URL with a HEAD request (falling back to GET), reports:
  - HTTP status code
  - Whether it's likely paywalled
  - Redirect chains
  - Timeouts and errors

Usage:
    python3 verify_urls.py                    # check all, write report
    python3 verify_urls.py --remove-broken    # also remove broken entries
    python3 verify_urls.py --remove-paywalled # also remove paywalled entries
"""

import json
import os
import sys
import time
import re
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import urllib.request
    import urllib.error
    import ssl
except ImportError:
    pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOPICS_DIR = os.path.join(SCRIPT_DIR, "data", "topics")
REPORT_FILE = os.path.join(SCRIPT_DIR, "url_verification_report.json")

# Domains known to be paywalled
PAYWALLED_DOMAINS = {
    "www.sciencedirect.com",
    "www.tandfonline.com",
    "link.springer.com",
    "onlinelibrary.wiley.com",
    "academic.oup.com",
    "www.cambridge.org",
    "journals.sagepub.com",
}

# Domains that sometimes paywall
MIXED_ACCESS_DOMAINS = {
    "www.thelancet.com",
    "www.nature.com",
    "www.science.org",
    "www.bmj.com",
    "www.annualreviews.org",
}


def check_url(url, timeout=15):
    """Check a URL and return status info."""
    result = {
        "url": url,
        "status": None,
        "error": None,
        "redirected_to": None,
        "likely_paywalled": False,
        "accessible": False,
    }

    try:
        domain = urlparse(url).netloc.lower()
        if domain in PAYWALLED_DOMAINS:
            result["likely_paywalled"] = True
    except Exception:
        pass

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; DevDiscourses-URLChecker/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        req = urllib.request.Request(url, method="HEAD", headers=headers)
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        result["status"] = resp.getcode()
        result["accessible"] = result["status"] in (200, 301, 302, 303, 307, 308)
        if resp.geturl() != url:
            result["redirected_to"] = resp.geturl()
    except urllib.error.HTTPError as e:
        result["status"] = e.code
        # Some servers reject HEAD, try GET
        if e.code in (403, 405, 406):
            try:
                req2 = urllib.request.Request(url, method="GET", headers=headers)
                resp2 = urllib.request.urlopen(req2, timeout=timeout, context=ctx)
                result["status"] = resp2.getcode()
                result["accessible"] = True
                resp2.close()
            except urllib.error.HTTPError as e2:
                result["status"] = e2.code
                result["accessible"] = False
            except Exception as e2:
                result["error"] = str(e2)
                result["accessible"] = False
        else:
            result["accessible"] = False
    except urllib.error.URLError as e:
        result["error"] = str(e.reason)
        result["accessible"] = False
    except Exception as e:
        result["error"] = str(e)
        result["accessible"] = False

    return result


def load_all_resources():
    """Load all resources from topic files."""
    import glob as g
    resources = []
    pattern = os.path.join(TOPICS_DIR, "*.json")
    for filepath in sorted(g.glob(pattern)):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        for entry in data:
            entry["_source_file"] = os.path.basename(filepath)
        resources.extend(data)
    return resources


def main():
    args = set(sys.argv[1:])
    remove_broken = "--remove-broken" in args
    remove_paywalled = "--remove-paywalled" in args

    resources = load_all_resources()
    total = len(resources)
    print(f"Checking {total} URLs...")

    results = []
    broken = []
    paywalled = []
    accessible = []

    # Use thread pool for concurrent checking
    url_map = {}
    for r in resources:
        url_map[r["url"]] = r

    unique_urls = list(set(r["url"] for r in resources))
    print(f"  ({len(unique_urls)} unique URLs)")

    checked = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        future_to_url = {executor.submit(check_url, url): url for url in unique_urls}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            checked += 1
            try:
                result = future.result()
                results.append(result)

                status_str = str(result["status"]) if result["status"] else "ERR"
                indicator = "OK" if result["accessible"] else "FAIL"
                if result["likely_paywalled"]:
                    indicator = "PAYWALL"

                if checked % 25 == 0 or not result["accessible"]:
                    print(f"  [{checked}/{len(unique_urls)}] {status_str} {indicator} {url[:80]}")

                if not result["accessible"]:
                    broken.append(result)
                if result["likely_paywalled"]:
                    paywalled.append(result)
                if result["accessible"] and not result["likely_paywalled"]:
                    accessible.append(result)

            except Exception as e:
                results.append({"url": url, "error": str(e), "accessible": False})
                broken.append({"url": url, "error": str(e)})

    # Summary
    print(f"\n{'='*60}")
    print(f"  URL Verification Report")
    print(f"{'='*60}")
    print(f"  Total URLs checked: {len(unique_urls)}")
    print(f"  Accessible:         {len(accessible)}")
    print(f"  Broken/Timeout:     {len(broken)}")
    print(f"  Likely paywalled:   {len(paywalled)}")
    print(f"{'='*60}")

    if broken:
        print(f"\nBroken URLs ({len(broken)}):")
        for r in broken:
            print(f"  [{r.get('status', 'ERR')}] {r['url'][:100]}")
            if r.get("error"):
                print(f"       Error: {r['error'][:80]}")

    if paywalled:
        print(f"\nPaywalled URLs ({len(paywalled)}):")
        for r in paywalled:
            print(f"  {r['url'][:100]}")

    # Write report
    report = {
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total": len(unique_urls),
        "accessible": len(accessible),
        "broken": len(broken),
        "paywalled": len(paywalled),
        "broken_urls": [r["url"] for r in broken],
        "paywalled_urls": [r["url"] for r in paywalled],
        "details": results,
    }
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nDetailed report written to {REPORT_FILE}")

    # Optionally remove entries
    if remove_broken or remove_paywalled:
        urls_to_remove = set()
        if remove_broken:
            urls_to_remove.update(r["url"] for r in broken)
        if remove_paywalled:
            urls_to_remove.update(r["url"] for r in paywalled)

        if urls_to_remove:
            print(f"\nRemoving {len(urls_to_remove)} entries from topic files...")
            import glob as g
            pattern = os.path.join(TOPICS_DIR, "*.json")
            total_removed = 0
            for filepath in sorted(g.glob(pattern)):
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                before = len(data)
                data = [r for r in data if r.get("url") not in urls_to_remove]
                removed = before - len(data)
                if removed > 0:
                    with open(filepath, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    print(f"  {os.path.basename(filepath)}: removed {removed}")
                    total_removed += removed
            print(f"Total removed: {total_removed}")
            print("Run `python3 build.py` to rebuild resources.json")


if __name__ == "__main__":
    main()
