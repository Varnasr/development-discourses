#!/usr/bin/env python3
"""
verify_urls.py - Check every resource URL and record what came back.

    python3 verify_urls.py                 # check all, write report + link_status
    python3 verify_urls.py --recheck       # only re-check what was not `ok` last time
    python3 verify_urls.py --limit 50      # first N unique URLs, for a quick look
    python3 verify_urls.py --no-write      # report only, leave topic files alone
    python3 verify_urls.py --remove-broken # delete entries whose link is really gone

WHY THIS WAS REWRITTEN

The previous version had one bucket for "not accessible" and offered
`--remove-broken` against it. Its report of 2026-02-28 put 162 of 516 URLs in
that bucket, and **102 of the 162 were HTTP 403**: 35 from
documents1.worldbank.org, 26 from thelancet.com, and the rest from ResearchGate,
Science, SAGE, ScienceDirect and other publishers that refuse robots as a matter
of policy. Every one of those opens in a browser. Running `--remove-broken`
would have deleted a fifth of the library, most of it live, and the deletion
would have looked like routine maintenance in the diff.

A 403 is the server declining **this client**. A 404 is the document being gone.
Collapsing the two is the whole defect, so this version keeps them apart and
only ever removes the second.

    ok        2xx after redirects. The document is there.
    blocked   401 / 403 / 406 / 429. The server refuses a robot. A human is fine.
    broken    404 / 410, DNS failure, TLS failure, refused connection.
    unknown   timeout, 5xx, anything else. Server trouble, probably transient.

Only `broken` is removable, and even then the script prints each entry and
requires the flag. `blocked` and `unknown` are never removable at any flag.

The old script also sent `User-Agent: DevDiscourses-URLChecker/1.0`, which is
close to the perfect string for getting blocked. It sends a browser UA now, and
an `Accept-Language`, because several of these hosts vary on it.
"""

import argparse
import glob
import json
import os
import random
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOPICS_DIR = os.path.join(SCRIPT_DIR, "data", "topics")
REPORT_FILE = os.path.join(SCRIPT_DIR, "url_verification_report.json")

# A real browser string. The point is not to deceive anyone: these are public
# documents and one request each. It is that the previous string was the kind a
# WAF drops by default, so the report described the checker rather than the web.
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")

HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
}

BLOCKED_CODES = {401, 403, 406, 429}
BROKEN_CODES = {404, 410}

# Publishers that put an open-access article behind an interstitial. The link is
# not broken and the reader is not necessarily stopped, but it is honest to say
# the library cannot confirm the full text from here.
PAYWALL_HOSTS = {
    "www.sciencedirect.com", "www.tandfonline.com", "link.springer.com",
    "onlinelibrary.wiley.com", "academic.oup.com", "www.cambridge.org",
    "journals.sagepub.com", "www.jstor.org",
}


def _open(url, method, timeout):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, method=method, headers=HEADERS)
    return urllib.request.urlopen(req, timeout=timeout, context=ctx)


def check_url(url, timeout=25):
    """Return {status, state, final_url, error} for one URL.

    HEAD first because it is cheap, then GET on anything that is not a clean
    2xx: a surprising number of these hosts answer 403 or 405 to HEAD and 200
    to GET, and the old script only retried GET on 403/405/406, so a host that
    answered 400 or 501 to HEAD was recorded as broken without a second look.
    """
    result = {"url": url, "status": None, "state": None, "final_url": None, "error": None}
    host = (urlparse(url).netloc or "").lower()

    for method in ("HEAD", "GET"):
        try:
            resp = _open(url, method, timeout)
            result["status"] = resp.getcode()
            if resp.geturl() != url:
                result["final_url"] = resp.geturl()
            resp.close()
            result["state"] = "ok"
            result["error"] = None
            break
        except urllib.error.HTTPError as e:
            result["status"] = e.code
            result["error"] = None
            if e.code in BROKEN_CODES:
                result["state"] = "broken"
            elif e.code in BLOCKED_CODES:
                result["state"] = "blocked"
            else:
                result["state"] = "unknown"
            if method == "GET":
                break
        except urllib.error.URLError as e:
            reason = str(e.reason)
            result["error"] = reason
            low = reason.lower()
            if ("name or service not known" in low or "nodename nor servname" in low
                    or "getaddrinfo" in low or "certificate" in low
                    or "connection refused" in low):
                result["state"] = "broken"
            else:
                result["state"] = "unknown"
            if method == "GET":
                break
        except Exception as e:  # noqa: BLE001 - any transport failure is 'unknown'
            result["error"] = str(e)
            result["state"] = "unknown"
            if method == "GET":
                break

    if result["state"] == "ok" and host in PAYWALL_HOSTS:
        result["state"] = "paywalled"
    return result


def load_topic_files():
    out = []
    for path in sorted(glob.glob(os.path.join(TOPICS_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            out.append((path, json.load(f)))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--recheck", action="store_true",
                    help="only re-check URLs the last report did not call ok")
    ap.add_argument("--limit", type=int, default=0, help="check only the first N unique URLs")
    ap.add_argument("--no-write", action="store_true",
                    help="touch nothing on disk: no report, no topic files. What the "
                         "scheduled gate runs, since it has no business rewriting a "
                         "committed file.")
    ap.add_argument("--remove-broken", action="store_true",
                    help="delete entries whose link is 404/410/DNS-dead. Never touches blocked.")
    ap.add_argument("--fail-on-new-broken", action="store_true",
                    help="exit 1 if a URL is broken that the committed report did not "
                         "already record as broken. This is the scheduled-run gate: "
                         "link rot needs no commit to happen, so it has to be caught "
                         "on a clock rather than on a pull request.")
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--timeout", type=int, default=25)
    args = ap.parse_args()

    files = load_topic_files()
    entries = [e for _, data in files for e in data]
    urls = sorted({e["url"] for e in entries})

    previous = {}
    if os.path.exists(REPORT_FILE):
        try:
            with open(REPORT_FILE, encoding="utf-8") as f:
                old = json.load(f)
            # Only carry forward details written by this version. The
            # pre-2026-09 report recorded an `accessible` boolean with no way
            # to tell a 403 from a 404, which is the classification this
            # rewrite exists to replace; reusing it would launder the old
            # verdict into the new report under a state name it never had.
            for d in old.get("details", []):
                if d.get("url") and d.get("state"):
                    previous[d["url"]] = d
        except (OSError, ValueError):
            previous = {}

    todo = urls
    if args.recheck and previous:
        todo = [u for u in urls if previous.get(u, {}).get("state") != "ok"]
        print(f"--recheck: {len(todo)} of {len(urls)} were not ok last time.")
    if args.limit:
        todo = todo[: args.limit]

    print(f"{len(entries)} entries, {len(urls)} unique URLs, checking {len(todo)}.")

    results = {}
    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(check_url, u, args.timeout): u for u in todo}
        for fut in as_completed(futures):
            url = futures[fut]
            done += 1
            try:
                r = fut.result()
            except Exception as e:  # noqa: BLE001
                r = {"url": url, "status": None, "state": "unknown", "error": str(e)}
            results[url] = r
            if r["state"] in ("broken", "unknown") or done % 50 == 0:
                print(f"  [{done}/{len(todo)}] {str(r['status'] or 'ERR'):>4} "
                      f"{r['state']:<9} {url[:88]}")

    # A single `unknown` is usually the far end having a moment. Give each one
    # one more try, serially and slowly, before it goes in the report as such.
    retry = [u for u, r in results.items() if r["state"] == "unknown"]
    if retry:
        print(f"\nRetrying {len(retry)} unknown result(s) once, serially.")
        for u in retry:
            time.sleep(0.4 + random.random() * 0.4)
            r = check_url(u, args.timeout + 10)
            results[u] = r
            print(f"  {str(r['status'] or 'ERR'):>4} {r['state']:<9} {u[:88]}")

    # Carry forward anything --recheck or --limit skipped, so the report always
    # describes the whole library rather than the subset this run looked at.
    details = []
    for u in urls:
        if u in results:
            details.append(results[u])
        elif u in previous and previous[u].get("state"):
            # Carried forward from the last run rather than checked now. The
            # marker stays in memory: it decides whether link_checked is
            # refreshed below, and writing it into the report would add churn
            # to every --recheck diff for no reader's benefit.
            d = dict(previous[u])
            d["_stale"] = True
            details.append(d)
        else:
            details.append({"url": u, "status": None, "state": "unchecked", "error": None})

    counts = {}
    for d in details:
        counts[d["state"]] = counts.get(d["state"], 0) + 1

    print("\n" + "=" * 62)
    print("  Link check")
    print("=" * 62)
    print(f"  unique URLs        {len(urls)}")
    for state in ("ok", "paywalled", "blocked", "unknown", "broken", "unchecked"):
        if counts.get(state):
            print(f"  {state:<18} {counts[state]}")
    print("=" * 62)

    broken = [d for d in details if d["state"] == "broken"]
    blocked = [d for d in details if d["state"] == "blocked"]
    if blocked:
        print(f"\n{len(blocked)} URL(s) refused a robot (403 and friends). These are NOT")
        print("broken; every one of them opens in a browser. They are never removed.")
    if broken:
        print(f"\nGone ({len(broken)}):")
        for d in broken:
            print(f"  [{d.get('status') or 'ERR'}] {d['url'][:100]}")

    report = {
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "unique_urls": len(urls),
        "entries": len(entries),
        "counts": counts,
        "broken_urls": [d["url"] for d in broken],
        "blocked_urls": [d["url"] for d in blocked],
        "details": [{k: v for k, v in d.items() if not k.startswith("_")}
                    for d in sorted(details, key=lambda d: d["url"])],
    }
    if args.no_write:
        print(f"\n--no-write: {os.path.basename(REPORT_FILE)} left as it is.")
    else:
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"\nReport written to {os.path.basename(REPORT_FILE)}")

    # Write the state back onto each entry so the site can say something
    # honest about a link before a reader clicks it. The previous pipeline had
    # a `verified` boolean that enrich_data.py reset to False on every build,
    # so resource.html's "Verified" badge was unreachable code.
    if not args.no_write:
        by_url = {d["url"]: d for d in details}
        touched = 0
        for path, data in files:
            changed = False
            for e in data:
                d = by_url.get(e["url"])
                if not d or d.get("state") == "unchecked":
                    continue
                if e.get("link_status") != d["state"]:
                    e["link_status"] = d["state"]
                    changed = True
                stamp = report["checked_at"][:10] if not d.get("_stale") else e.get("link_checked")
                if stamp and e.get("link_checked") != stamp:
                    e["link_checked"] = stamp
                    changed = True
            if changed:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                touched += 1
        print(f"link_status written into {touched} topic file(s). "
              f"Run `make build` to regenerate.")

    if args.remove_broken:
        gone = {d["url"] for d in broken}
        if not gone:
            print("\nNothing to remove.")
        else:
            print(f"\nRemoving {len(gone)} entry group(s) whose link is gone.")
            removed = 0
            for path, data in files:
                keep = [e for e in data if e["url"] not in gone]
                if len(keep) != len(data):
                    for e in data:
                        if e["url"] in gone:
                            print(f"  - {e['title'][:70]}")
                    with open(path, "w", encoding="utf-8") as f:
                        json.dump(keep, f, indent=2, ensure_ascii=False)
                        f.write("\n")
                    removed += len(data) - len(keep)
            print(f"Removed {removed}. Run `make build`.")

    if args.fail_on_new_broken:
        was_broken = {u for u, d in previous.items() if d.get("state") == "broken"}
        now_broken = {d["url"] for d in broken}
        fresh = sorted(now_broken - was_broken)
        healed = sorted(was_broken - now_broken)
        if healed:
            print(f"\n{len(healed)} link(s) that were broken now answer. Re-commit the "
                  f"report so the baseline moves with them:")
            for u in healed:
                print(f"  + {u[:100]}")
        if fresh:
            print(f"\n{len(fresh)} link(s) broke since the committed report:")
            for u in fresh:
                print(f"  - {u[:100]}")
            print("\nFAIL: new link rot. Find the document's current home and update the "
                  "topic file, or leave it and let the resource page say so.", file=sys.stderr)
            return 1
        print("\nOK: no link broke since the committed report.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
