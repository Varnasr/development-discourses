# development-discourses

A curated open-access library: 645 research papers, books and grey literature
for development practitioners in South Asia, across 19 topics. Static HTML, no
build step for the part that runs, a standard-library Python pipeline for the
part that generates. Deployed to GitHub Pages under `/development-discourses/`.

## Commands

```bash
make build       # enrich topic files, merge, regenerate every derived asset
make test        # 31 checks
make contrast    # every ink token against every surface, both themes
make verify      # check every resource URL, write the report and link_status
make recheck     # re-check only what was not ok last time (much faster)
make serve       # http://localhost:8000
```

There are no dependencies. `pytest` is the only dev one. The front end is
vanilla HTML, CSS and JavaScript; the pipeline is the Python standard library.
Keep it that way.

## One source, five derived files

`data/topics/*.json` is the only thing anyone edits, one file per topic.
`build.py` merges them into `data/resources.json`, and `generate_assets.py`
derives `data/search-index.json`, `data/stats.json`, `sitemap.xml`, `feed.json`
and `opensearch.xml`. CI fails if any of those has drifted from the source, so
**run `make build` and commit the result** with any data change.

## A 403 is not a 404, and conflating them nearly cost a fifth of the library

`verify_urls.py` sorts every URL into `ok`, `paywalled`, `blocked`, `unknown`
or `broken`. That distinction is the whole point of the script.

The version before 2026-09-23 had one bucket for "not accessible" and offered
`--remove-broken` against it. Its report of 2026-02-28 put **162 of 516** URLs
in that bucket, and **102 of the 162 were HTTP 403**: 35 from
documents1.worldbank.org, 26 from thelancet.com, the rest from ResearchGate,
Science, SAGE and ScienceDirect. Every one opens in a browser. Running the flag
would have deleted a fifth of the library, most of it live, and the diff would
have read as routine maintenance.

It also sent `User-Agent: DevDiscourses-URLChecker/1.0`, which is close to the
perfect string for getting blocked, so the report described the checker rather
than the web.

Re-run honestly: 644 unique URLs, 25 genuinely broken. Seventeen were traced to
their current home and replaced, each probed before it went in; eight remain
and are flagged on their own resource pages rather than hidden.

- **Only `broken` is ever removable.** `blocked` and `unknown` are not, at any
  flag, and `--remove-broken` prints every entry before touching anything.
- **`--fail-on-new-broken` is the gate**, run daily by `link-check.yml`. It
  compares against the committed report, so a link that was already gone does
  not keep failing the run while one that broke last night does.
- **Re-checking cannot find a cataloguing error.** The entry for WHO's economic
  case for investing in mental health pointed at
  `who.int/publications/i/item/9789241511810`; that ISBN is a standard
  operating procedure for measuring nicotine in cigarette smoke. The URL was
  wrong the day it was written.

## Duplicates are merged, not dropped

`build.py` used to keep the first entry under a normalised title and discard
the rest silently: 24 of 669 entries, and **all 21 affected titles spanned more
than one topic**. What it discarded was a curator's topic assignment.
"Conditional Cash Transfers: Reducing Present and Future Poverty" is filed
under both Public Policy & Governance and Social Protection; after
deduplication it existed only under the first, because that file sorts earlier,
and a reader filtering to Social Protection could not find it. The count in
`stats.json` agreed with itself throughout.

Eleven of the 21 also carried **different URLs** under the same title, usually
a working paper beside the published version. Dropping one lost a real link.

So `merge_duplicates()` keeps one record with `topics` carrying every topic and
`alt_urls` carrying the other links. `topic` stays as the first topic, so
anything reading a scalar keeps working. Restoring those assignments moved
Research Methods from 46 to 53, Public Policy & Governance from 50 to 55 and
Livelihoods from 49 to 54.

**If you add a consumer of topic, read `topics`.** `topicsOf()` in `js/app.js`
and `js/resource.js` is the accessor; `build_stats` counts across the list.

## The badge that could never appear

`resource.html` carried a "Verified" badge driven by `r.verified`, and
`enrich_data.py` set that field to `False` on every resource on every build.
The branch was unreachable, and the word promised an editorial judgement the
pipeline never made. It is gone. What the pipeline actually knows is
`link_status` and `link_checked`, written by `verify_urls.py` and deliberately
not touched by `enrich_data.py`.

## Colour

`make contrast` reads the token blocks out of **both** stylesheets, in the
order the pages load them, and measures every ink against every surface in both
themes. It gates pull requests because it needs no browser and no network.

Two things it caught and two it could not.

- `--color-text-muted` was `#8a8a8a`, **3.28:1** on the page background, across
  twelve rules: every card byline, count and helper line. `--color-book` and
  `--color-grey` were similar.
- `.resource-type-badge` used tokens and `.access-badge` was a **second copy of
  the same system written as literals**, and neither had a dark value. In dark
  mode an Open Access badge painted `#059669` on `#ecfdf5`, a pale mint chip on
  a near-black card, at about 1.7:1. The fills are `--badge-*-bg` tokens now,
  which is what makes them checkable at all.
- **Three `#8a8a8a` literals in JavaScript survived the token pass**, because
  `make contrast` reads CSS. Two in `js/resource.js` (the "no resource
  specified" line and the Unknown access badge) and one in `js/litmap.js` (the
  "no strong connections" message drawn into the SVG). That is the same colour
  the CSS pass replaced at 3.28:1, still being written at runtime. Grep the
  JavaScript too when you move a colour.
- **What it could not see**: `color: white` on `background: var(--color-accent)`
  in seven rules. The accent is a *fill* there, not a surface, and `white` is a
  literal. Light theme 7.51:1, dark theme **2.22:1**, because the kit re-aliases
  the accent to `#6cb2ff`. Every filled pill, the Read at Source button, the
  active citation tab and the saved toggle were failing in dark mode as
  shipped. It is `--color-on-accent` now, and `FILLS` in the script measures
  that direction too.
- **The header scrolled sideways on a phone.** `.header-nav` was a flex row
  with no wrap: 545px inside a 390px viewport, 179px of horizontal scroll. It
  looks perfect on a desktop, which is why it survived.

The last two were found by running axe over the built pages in both themes at
both viewports. A token check and a browser audit are not substitutes for each
other; run both when you touch colour.

## Watch out for

- **The service worker shell is cache-first.** Change any of `index.html`,
  `resource.html`, `css/*` or `js/*` and bump `CACHE_VERSION` in
  `service-worker.js`, or a returning visitor keeps the old files. The
  2026-09-23 change added markup that only the new JS fills and only the new
  CSS styles; without the bump the feature would have been invisible to
  everyone who had visited before.
- **A `<label>` cannot name a `<div>`.** Four filter groups were
  `<label>Topic</label><div class="filter-pills">`, which associates nothing, so
  a screen reader met four unnamed groups of buttons announcing "All", "All",
  "Any Year". They are `role="group"` with `aria-labelledby` now, and the
  selected pill carries `aria-pressed` rather than only a CSS class.
- **`a { text-decoration: none }` is wrong inside a paragraph.** A link
  distinguished from its surrounding text by colour alone fails WCAG 1.4.1.
  Underlined in `.about-content p`, the footer tagline and the link notes.
- **`title` is not an accessible name.** It shows on no touch device and is
  announced unreliably. Icon-only buttons carry `aria-label`.
- **Link rot needs no commit**, which is why `link-check.yml` is on a daily
  schedule and not on pull requests. It also runs in its own workflow: a job
  cancelled by its own `timeout-minutes` cancels the whole run, so a long
  third-party crawl sharing a run with the build would take the build down
  with it.
- **The lychee step used to crawl the wrong thing.** It globbed `**/*.html` and
  `**/*.md`, which is the site chrome. The 644 links this library exists to
  hold are in `data/topics/*.json` and were outside the crawl entirely.

## Testing

`.github/workflows/ci.yml` runs the build, the drift check, 31 tests and the
contrast check on every push and pull request. `.github/workflows/link-check.yml`
runs the resource-URL check and the page crawl daily at 05:17 UTC, plus on
demand.
