# Development Discourses

[![Website](https://img.shields.io/badge/Website-impactmojo.in-orange)](https://www.impactmojo.in)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Varnasr/development-discourses)](https://github.com/Varnasr/development-discourses/commits/main)
[![Part of ImpactMojo](https://img.shields.io/badge/Part%20of-ImpactMojo-orange)](https://www.impactmojo.in)

**A curated open-access library of 500+ research papers, books, and grey literature for development practitioners in South Asia.**

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
| **Data & Technology** | Data governance, open data, AI ethics, digital development |
| **Livelihoods** | Self-help groups, skills development, migration, rural livelihoods |
| **Research Methods** | RCTs, mixed methods, participatory action research, ethnography |

---

## Features

| Feature | Description |
|---------|-------------|
| **Search** | Full-text search across titles, authors, abstracts, and tags |
| **Filter** | Filter by theme, resource type, region, publication year |
| **Resource Types** | Academic papers, books, reports, toolkits, grey literature, policy briefs |
| **Open Access Only** | Every resource is freely and legally accessible |
| **Verified URLs** | All links validated by `verify_urls.py` — broken links flagged automatically |
| **Zero Dependencies** | Vanilla HTML/CSS/JS — no build step required |

---

## Project Structure

```
development-discourses/
├── index.html              # Main library interface (search + filter)
├── resource.html           # Individual resource view
├── data/                   # Resource database (JSON/CSV)
├── css/                    # Stylesheets
├── js/                     # Search and filter logic
├── build.py                # Builds the static site from data files
├── add_resource.py         # CLI tool to add new resources
├── enrich_data.py          # Enriches resource metadata (abstracts, tags)
├── verify_urls.py          # Checks all URLs are live and accessible
├── url_verification_report.json  # Latest URL health check
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

Or edit the data files directly and run `python build.py` to regenerate the static site.

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
| Frontend | Vanilla HTML / CSS / JavaScript | Zero-dependency search and browse interface |
| Data | JSON / CSV | Resource metadata and content |
| Build | Python (`build.py`) | Generates static HTML from data files |
| Verification | Python (`verify_urls.py`) | URL health checks |

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
