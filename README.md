# Development Discourses

**A curated open-access library of research papers, books, and grey literature for development practitioners.**

Part of [ImpactMojo](https://www.impactmojo.in) — free development economics & policy education for South Asia.

## What is this?

Development Discourses is a searchable, filterable library of 500+ open-access resources covering the topics that matter to development professionals:

- **MEAL & Evaluation** — Monitoring, evaluation, accountability, learning
- **Development Economics** — Poverty, inequality, growth, microfinance
- **Gender & Social Inclusion** — Feminist economics, intersectionality, caste, disability
- **Climate & Environment** — Climate resilience, adaptation, just transition
- **Public Health** — Universal health coverage, nutrition, community health
- **Public Policy & Governance** — Decentralization, digital governance, accountability
- **Data & Technology** — Data governance, open data, AI ethics
- **Livelihoods** — Self-help groups, skills, migration, rural development
- **Research Methods** — RCTs, mixed methods, participatory research

Every resource is **free to read** — no paywalls.

## Live Site

**[development-discourses on GitHub Pages](https://varnasr.github.io/development-discourses/)**

## Tech Stack

- Pure HTML, CSS, JavaScript — no frameworks, no build step
- JSON data files in `data/topics/` merged into `data/resources.json`
- Hosted on GitHub Pages

## Features

- Full-text search (title, author, keywords)
- Filter by topic and resource type (paper / book / grey literature)
- Sort by title, year, or author
- List and grid views
- Responsive design
- Keyboard shortcut: press `/` to focus search

## Project Structure

```
data/
  topics/                    # Source of truth — one file per topic
    climate_environment_resources.json
    data_technology_for_development.json
    development_economics_resources.json
    gender_social_inclusion_resources.json
    livelihoods_resources.json
    meal_resources.json
    public_health_resources.json
    public_policy_governance_resources.json
    research_methods_resources.json
  resources.json             # Auto-generated merged file (website reads this)
build.py                     # Merges topic files → resources.json
add_resource.py              # Helper to add entries to topic files
```

## Adding Resources

### Option 1: Edit a topic file directly

Open any file in `data/topics/` and add an entry:

```json
{
  "title": "Resource Title",
  "authors": "Author Name(s)",
  "year": 2024,
  "type": "paper",
  "topic": "Development Economics",
  "url": "https://example.com/paper.pdf",
  "description": "Brief description of the resource."
}
```

Then rebuild:

```bash
python3 build.py
```

### Option 2: Use the add_resource helper

```bash
# Interactive mode
python3 add_resource.py

# Batch import from a file
python3 add_resource.py --from-file new_entries.json --topic livelihoods_resources.json
```

### Option 3: Ask Claude to add entries

In a Claude Code session, just ask:

> "Add 10 more livelihoods papers to data/topics/livelihoods_resources.json"

Then run `python3 build.py` to merge.

### Build commands

```bash
python3 build.py              # Merge all topic files
python3 build.py --stats      # Show stats after merging
python3 build.py --validate   # Check for missing fields
python3 build.py --dry-run    # Preview without writing
```

**type** must be one of: `paper`, `book`, `grey_literature`

**topic** should match an existing topic or be a new category.

To suggest a resource, [open an issue](https://github.com/Varnasr/development-discourses/issues/new).

## Local Development

Just open `index.html` in a browser, or serve locally:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## License

Content curation is CC BY 4.0. Code is MIT.
