# Development Discourses

[![Website](https://img.shields.io/badge/Website-impactmojo.in-orange)](https://www.impactmojo.in)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Varnasr/development-discourses)](https://github.com/Varnasr/development-discourses/commits/main)
[![Part of ImpactMojo](https://img.shields.io/badge/Part%20of-ImpactMojo-orange)](https://www.impactmojo.in)

**A curated open-access library of 640+ research papers, books, and grey literature for development practitioners in South Asia.**

Searchable, filterable, and fully free — part of the [ImpactMojo](https://www.impactmojo.in) learning platform.

---

## About

Development Discourses is a curated reference library for development professionals, researchers, and students. It aggregates open-access materials across the full breadth of development practice — from academic papers to practitioner guides to grey literature that rarely makes it into university syllabi.

Every resource is open-access, verified, and contextualised for South Asian development work.

---

## Coverage

| Theme | Examples |
|-------|---------|
| **MEAL & Evaluation** | Monitoring frameworks, evaluation methodology, accountability, adaptive management |
| **Development Economics** | Poverty measurement, inequality, microfinance, labour markets, growth theory |
| **Gender & Social Inclusion** | Feminist economics, intersectionality, care economy, caste, disability, LGBTQ+ inclusion |
| **Climate & Environment** | Climate resilience, adaptation finance, just transition, environmental justice |
| **Public Health** | Universal health coverage, nutrition, community health workers, WASH |
| **Public Policy & Governance** | Decentralisation, digital governance, RTI, social accountability |
| **Data & Technology** | Data governance, open data, AI ethics, digital public infrastructure |
| **Livelihoods** | Self-help groups, skills development, migration, rural livelihoods |
| **Research Methods** | RCTs, mixed methods, participatory action research, ethnography |
| **Energy & Just Transition** | Energy access, renewables, clean cooking, just transition of work |
| **Mental Health & Wellbeing** | Global mental health, psychosocial support, the treatment gap |

Plus Agriculture & Food Systems, Conflict & Humanitarian, Disability & Inclusion, Education, Financial Inclusion, Migration & Urbanization, Social Protection, and WASH — **19 topics** in all.

---

## Features

| Feature | Description |
|---------|-------------|
| **Search** | Full-text search across titles, authors, abstracts, and tags, with match highlighting and a relevance-ranked "Best Match" sort |
| **Faceted filters** | Filter by topic, resource type, **access level**, and **publication decade** — with live counts and one-click removable filter chips |
| **Shareable state** | Every search and filter combination is encoded in the URL, so any view can be bookmarked or shared |
| **Export** | Download the current filtered list as **BibTeX**, **CSV**, or **JSON** |
| **Connection Map** | An interactive, force-directed graph of related resources on every detail page (pure SVG, no dependencies) |
| **Citations** | One-click APA, BibTeX, and Chicago citations per resource |
| **Recently viewed** | Your last-viewed resources are remembered locally and surfaced on detail pages |
| **Surprise me** | Jump to a random resource from the current selection |
| **Light / dark / system theme** | Respects your OS preference and remembers your choice |
| **Installable & offline** | A Progressive Web App with a service worker — install it and browse offline |
| **Open access first** | Every resource is tagged *Open Access*, *Free to Read*, or *Check Access* |
| **Verified URLs** | All links validated by `verify_urls.py` — broken links flagged automatically |
| **Zero runtime dependencies** | Vanilla HTML/CSS/JS on the front end; standard-library Python for the build |

---

## Project Structure

```
development-discourses/
├── index.html              # Main library interface (search + faceted filters)
├── resource.html           # Individual resource view + connection map
├── manifest.webmanifest    # PWA manifest
├── service-worker.js       # Offline caching (app shell + data)
├── icon.svg                # App / favicon icon
├── sitemap.xml             # Generated — search-engine sitemap
├── feed.json               # Generated — JSON Feed of recent resources
├── opensearch.xml          # Generated — browser search integration
├── data/
│   ├── topics/*.json       # Source of truth: one file per topic
│   ├── resources.json      # Generated — merged, deduplicated library
│   ├── search-index.json   # Generated — trimmed index
│   └── stats.json          # Generated — aggregate counts
├── css/style.css           # Stylesheet (light + dark themes)
├── js/
│   ├── app.js              # Library: search, filters, export, URL state
│   ├── resource.js         # Detail page: citations, SEO, recently viewed
│   └── litmap.js           # Force-directed connection graph (SVG)
├── build.py                # Merge topic files → resources.json + assets
├── enrich_data.py          # Add ids, access types, DOIs, tags
├── generate_assets.py      # Build sitemap, feed, opensearch, stats
├── add_resource.py         # CLI tool to add new resources
├── verify_urls.py          # Check all URLs are live and accessible
├── tests/                  # pytest data-integrity suite
├── Makefile                # build / test / serve / verify tasks
├── pyproject.toml          # Project + dev-tooling config
├── LICENSE
└── README.md
```

---

## Adding Resources

Use the CLI tool to add new resources:

```bash
python add_resource.py --title "Resource Title" \
  --author "Author Name" \
  --url "https://..." \
  --theme "Gender" \
  --type "paper" \
  --year 2024
```

Or edit the topic files in `data/topics/` directly, then regenerate everything with one command:

```bash
make build      # enrich topic files → resources.json → sitemap/feed/stats/index
```

Run `make help` to see all available tasks (`build`, `enrich`, `assets`, `stats`, `validate`, `verify`, `serve`, `test`, `clean`).

---

## URL Verification

```bash
# Check all resource URLs
python verify_urls.py

# Results saved to url_verification_report.json
```

Broken links are flagged for manual review. Run periodically to maintain library quality.

---

## Local Development

```bash
git clone https://github.com/Varnasr/development-discourses.git
cd development-discourses

# View the library
open index.html

# Or serve locally
python3 -m http.server 8000
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla HTML / CSS / JavaScript | Zero-dependency search, faceted filtering, export, and theming |
| Offline | Service Worker + Web App Manifest | Installable PWA with offline caching |
| Discovery | JSON-LD structured data, Open Graph, sitemap, JSON Feed, OpenSearch | SEO and machine-readable metadata |
| Data | JSON (one file per topic) | Resource metadata, merged and deduplicated at build time |
| Build | Python stdlib (`enrich_data.py`, `build.py`, `generate_assets.py`) | Enrich, merge, and generate derived assets |
| Testing | pytest | Data-integrity and asset-generation checks |
| CI | GitHub Actions | Build validation, drift check, tests, and link checking |
| Verification | Python (`verify_urls.py`) | URL health checks |

No runtime dependencies: the front end ships as static files, and the entire
Python pipeline uses only the standard library. `pytest` is the sole (dev-only)
dependency.

---

## Testing

```bash
pip install pytest      # dev dependency only
make test               # or: python3 -m pytest -q
```

The suite validates that every topic entry has the required fields, that
resource IDs and titles are unique, that access types are valid, and that the
asset generators produce well-formed output.

---

## Part of the ImpactMojo Ecosystem

**Related repositories:**
- [ImpactMojo](https://github.com/Varnasr/ImpactMojo) — Main platform
- [dev-case-studies](https://github.com/Varnasr/dev-case-studies) — 200 real development case studies
- [ImpactLex](https://github.com/Varnasr/ImpactLex) — Development sector terminology dictionary
- [PolicyDhara](https://github.com/Varnasr/PolicyDhara) — Indian policy tracker

---

## License

- **Content / curated resources:** CC BY-NC-SA 4.0
- **Code (build scripts, search logic):** MIT

---

## Contact

- **Platform:** [impactmojo.in](https://www.impactmojo.in)
- **GitHub:** [github.com/Varnasr](https://github.com/Varnasr)
