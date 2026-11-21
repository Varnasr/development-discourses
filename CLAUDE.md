# development-discourses

Shared engineering standard: @.claude/engineering-standards.md. It applies to all work in this repository. This file adds what is specific to the project, and wins where the two disagree.

A curated library, open access first: 751 research papers, books and grey
literature for development practitioners in South Asia, across 19 topics. Of the
751, 382 are tagged open access, 124 free to read and 245 check access (counted
on 21 November 2026; `data/stats.json` holds the current figures). Static HTML, no
build step for the part that runs, a standard-library Python pipeline for the
part that generates. Deployed to GitHub Pages at
https://devdiscourses.impactmojo.in/ (the `CNAME` file), served at the root.

## Commands

```bash
make build       # enrich topic files, merge, regenerate every derived asset
make test        # 46 checks
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

## The access label is a guess unless someone looked

`enrich_data.py` sets `access_type` from the URL's domain on every build, so
writing it by hand in a topic file does nothing. The guess is wrong in both
directions: every `doi.org` link reads "check access" whatever licence the
article carries, and everything on `www.who.int` or `hdr.undp.org` reads "open
access" whether or not the page states a licence.

An entry may carry `access_observed`, set when it was added from what the
landing page itself showed: `open_access` only where the page states an open
licence or the publisher marks it open, `free_to_read` where the text opens
without payment and no open licence is stated, `check_access` otherwise. It
wins over the guess, an unknown value fails the build, and two tests hold both.
The 64 entries added on 21 November 2026 carry it. About 40 older entries have a
Creative Commons `license` recorded and still read "check access" because their
URL is a DOI; nobody has opened those pages to confirm, so they were left.

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

## The redesign of 21 November 2026

The owner called the site ugly and boring, so the whole front end was redrawn
as a typography-led library, in step with Dev Case Studies. Data, ids, URLs,
canonicals, the sitemap and the feed did not change.

- **Look.** Source Serif 4 for titles and reading text, Inter for labels and
  controls, a type scale in `--step-*`, hairline rules and one 2px ink rule per
  section, 2px corners, no shadows and no boxed cards. `css/style.css` was
  rewritten; the token names are the ones `check_contrast.py` already reads.
- **Index.** A masthead sentence (the `h1`) and five figures filled from
  `data/stats.json` by `updateStats()`; nothing is typed. The three access
  figures are links that set the access filter. Search is the first control.
  Results are `article.resource-card` entries: title link, authors and year,
  a clamped summary, then a fixed row of type, access badge and topics. An
  entry used to be an `<a>` with a `<button>` inside it, which is invalid; the
  save button is now a sibling of the title link.
- **Access badge.** `.access-badge.access-<type>` is the only filled, coloured
  mark in an entry, on the `--badge-*-bg` tokens. The dot in front is full,
  half or hollow, so the meaning does not rest on colour. The type is a plain
  uppercase label, so `--color-paper` and `--badge-paper-bg` are unused today.
- **Resource page.** Entry header (type, access, link status, title, citation
  line, topics), Read at source, summary, the citation always on the page with
  APA, Chicago and BibTeX and a copy button (Cite is a jump link to it),
  keywords, the map, and Details, Related and Recently viewed as ruled
  sections. Details shows Journal and Licence where the record has them;
  `LICENCE_LABEL` is written in both `resource_pages.py` and `js/resource.js`.
- **Theme.** One cycling button, `#themeToggle`, run by `js/theme.js` on every
  page: device setting, light, dark. Same key as before, `imx_theme` (no entry
  means device setting). The inline script in each `<head>` sets `data-theme`
  and `data-theme-pref` before first paint, and the button's icon is chosen in
  CSS from `data-theme-pref`, so neither flashes. The reading-font button sits
  beside it through `data-dyslexia-slot`, at the same 40px.
- **Footer.** The kit paints a dark band with literal colours. `style.css`
  overrides it into the page's own inks, which the contrast check can measure.

Measured at 390x844: the first resource starts at 535px (603px before). At
1440x900 it starts at 422px (256px before), because the masthead is new; an
entry is shorter than a card was, so about three entries show on the first
screen. Do not add height above the list without measuring both.

Traps met on the way:

- **`escapeHtml()` in `js/app.js` does not escape quotes.** It is right for
  text and wrong inside an attribute. Use `escapeAttr()` for `href`,
  `aria-label` and `data-*` values.
- **A script that names a layout class breaks when the layout changes.** The
  Insights topic bars called `document.querySelector('.results-section')`,
  which no longer exists, and threw on click. Only driving the feature in a
  browser found it. Scripts now use ids (`#library`).
- **The filter bar and the sort control each exist once.** `.library-grid`
  places `.controls-bar`, `.rail`, `.results-header` and `.results-col` by grid
  area above 1024px and in source order below. The bar opens through
  `.library-grid:has(.filter-toggle[aria-expanded="true"])`.
- **Colours in the map came from JavaScript literals.** Labels and node
  outlines are now CSS classes (`.litmap-label`, `.litmap-year`), and link
  lines read `--color-accent` at draw time. The nineteen topic dot colours are
  still literals in `js/litmap.js`; they carry no text.
- **The map is still mouse only.** A keyboard reader gets the same resources
  from the Related list, and the SVG's label says so.
- **`[hidden]` now has a global `display: none !important` rule**, so the trap
  recorded below cannot recur.
- **Separators are text to a contrast audit.** The `/` in the breadcrumb was
  set in the border colour at 1.58:1. It is `--color-text-muted` now.

## The first screen carried no library

Measured at 1280x900 on 2026-09-23: **620px of controls before the first
resource**, so one card was on the first screen and the fold cut it. The search
box and five filter groups ran the full width above the results, and the whole
block was `position: sticky`, so scrolling pinned 500px of filters to the top
of the viewport for the rest of the session. On a phone it was worse: the same
five groups stack to about 500px, which is the whole screen.

The filters are a 286px rail above 1024px and the results start at the top of
the page. Pixels to the first resource went 640 to 255, and 3 cards fit on the
first screen where one did. The sticky is on the rail now, which is short
enough to justify one.

Below 1024px the rail is behind a `Filters` disclosure, closed by default,
carrying a count of how many filters are on. **That count is not decoration.**
A collapsed panel silently holding three filters is a reader looking at 40
results and concluding the library is small. `renderActiveFilters()` writes it
and deliberately excludes the search term, which is visible in the search box.

One trap while doing it: `.filter-toggle-count { display: inline-flex }` beats
the `hidden` attribute's user-agent rule, so the badge rendered `0` when no
filter was on. `[hidden]` needs its own rule whenever you give an element a
`display`.

## One static page per resource

`resource/<id>.html` is written for every resource by `resource_pages.py`, called
from `generate_assets.py` and `build.py`. It is `resource.html` with the head and
the visible content filled in, so the title, canonical, share tags, JSON-LD,
summary, topics and the link out are in the HTML and need no script. The
sitemap and feed point at these addresses. `js/resource.js` runs on the same
markup (`body[data-static]`) and adds citations, related resources and the
connection map; it leaves the head alone there. `resource.html?id=<id>` still
works and its script sets the canonical to the static page. Titles are cut to
65 characters, and titles that only differ late are cut from the middle so all
751 stay distinct. Edit `resource.html`, never `resource/`; CI fails on drift,
and the lychee crawl skips `resource/` because `verify_urls.py` covers those links.

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
- **A 202 is not a document.** opendocs.ids.ac.uk, escholarship.org and a few
  UN hosts answer a robot with 202 and an empty bot-challenge page, and
  `verify_urls.py` counts any 2xx as `ok`. 8 entries in the committed report
  rest on a 202. One of them, IDS's social protection report (Figshare article
  26201478), is gone: the runner got 404 on 2026-10-18 and Figshare's API
  answers 404 for the id, and it was recorded as broken. **The recheck of
  2026-11-21 was answered 202 and the checker wrote `ok` over that record.**
  Figshare's API still answered 404 the same day, so the `ok` on that entry is
  wrong and the page no longer flags it. A possible successor is Figshare
  article 26459881 (Béné 2011, *IDS Bulletin* 42(6)), which was not confirmed
  to be the same document. Whether 202 should read as `unknown` is a
  classification decision for the owner, not made here; until it is made, a
  recheck can undo a `broken` verdict on any of these hosts.
- **Link rot needs no commit**, which is why `link-check.yml` is on a daily
  schedule and not on pull requests. It also runs in its own workflow: a job
  cancelled by its own `timeout-minutes` cancels the whole run, so a long
  third-party crawl sharing a run with the build would take the build down
  with it.
- **The lychee step used to crawl the wrong thing.** It globbed `**/*.html` and
  `**/*.md`, which is the site chrome. The 644 links this library exists to
  hold are in `data/topics/*.json` and were outside the crawl entirely.

## Testing

`.github/workflows/ci.yml` runs the build, the drift check, 46 tests and the
contrast check on every push and pull request. `.github/workflows/link-check.yml`
runs the resource-URL check and the page crawl daily at 05:17 UTC, plus on
demand.
