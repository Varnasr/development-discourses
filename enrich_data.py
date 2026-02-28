#!/usr/bin/env python3
"""
enrich_data.py - Enrich resource data with IDs, access classification, DOIs, and tags.

Adds the following fields to each resource:
  - id: URL-safe slug derived from title
  - access_type: "open_access" | "free_to_read" | "check_access"
  - doi: extracted from URL where possible
  - tags: auto-generated keyword tags from title/description
  - verified: false (placeholder for manual verification)

Usage:
    python3 enrich_data.py              # enrich all topic files in-place
    python3 enrich_data.py --dry-run    # preview without writing
"""

import json
import glob
import os
import re
import sys
from urllib.parse import urlparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOPICS_DIR = os.path.join(SCRIPT_DIR, "data", "topics")

# ---- Access type classification by domain ----

OPEN_ACCESS_DOMAINS = {
    "journals.plos.org",
    "pmc.ncbi.nlm.nih.gov",
    "pubmed.ncbi.nlm.nih.gov",
    "www.mdpi.com",
    "arxiv.org",
    "archive.org",
    "openknowledge.worldbank.org",
    "documents1.worldbank.org",
    "documents.worldbank.org",
    "openknowledge.fao.org",
    "www.fao.org",
    "library.oapen.org",
    "www.ipcc.ch",
    "www.who.int",
    "iris.who.int",
    "apps.who.int",
    "data.unicef.org",
    "www.unicef.org",
    "www.undp.org",
    "hdr.undp.org",
    "www.ilo.org",
    "unctad.org",
    "desapublications.un.org",
    "www.un.org",
    "unhabitat.org",
    "www.unep.org",
    "www.oecd-ilibrary.org",
    "read.oecd-ilibrary.org",
    "www.adb.org",
    "www.frontiersin.org",
    "bmcpublichealth.biomedcentral.com",
    "bmjopen.bmj.com",
    "globalizationandhealth.biomedcentral.com",
    "equityhealthj.biomedcentral.com",
    "conflictandhealth.biomedcentral.com",
    "implementationscience.biomedcentral.com",
    "reproductive-health-journal.biomedcentral.com",
    "www.jmir.org",
    "jogh.org",
    "www.gov.uk",
    "ideas.repec.org",
    "wdr2021.worldbank.org",
    "datatopics.worldbank.org",
    "www.cgdev.org",
    "www.wider.unu.edu",
    "www.ifpri.org",
    "ebrary.ifpri.org",
    "www.3ieimpact.org",
    "www.poverty-action.org",
    "www.povertyactionlab.org",
    "www.betterevaluation.org",
}

FREE_TO_READ_DOMAINS = {
    "www.nber.org",
    "economics.mit.edu",
    "scholar.harvard.edu",
    "dspace.mit.edu",
    "web.stanford.edu",
    "sticerd.lse.ac.uk",
    "www.lse.ac.uk",
    "www.brookings.edu",
    "www.imf.org",
    "www.rbi.org.in",
    "niti.gov.in",
    "www.oecd.org",
    "www.gsma.com",
    "www.itu.int",
    "www.worldbank.org",
    "www.pnas.org",
    "www.nature.com",
    "www.science.org",
    "papers.ssrn.com",
    "ssrn.com",
    "www.annualreviews.org",
    "www.jstor.org",
    "econpapers.repec.org",
    "sites.google.com",
    "faculty.wcas.northwestern.edu",
    "personal.lse.ac.uk",
    "www.dartmouth.edu",
    "rpds.princeton.edu",
    "chrisblattman.com",
    "www.chris-blattman.com",
}

LIKELY_PAYWALLED_DOMAINS = {
    "www.sciencedirect.com",
    "www.tandfonline.com",
    "link.springer.com",
    "onlinelibrary.wiley.com",
    "academic.oup.com",
    "www.cambridge.org",
    "journals.sagepub.com",
}


def classify_access(url):
    """Classify access type based on URL domain."""
    try:
        domain = urlparse(url).netloc.lower()
    except Exception:
        return "check_access"

    if domain in OPEN_ACCESS_DOMAINS:
        return "open_access"

    # BioMedCentral subdomains
    if domain.endswith(".biomedcentral.com"):
        return "open_access"

    # Lancet regional journals are often open access
    if domain == "www.thelancet.com":
        if "/lansea/" in url or "/langlo/" in url or "/lanwpc/" in url:
            return "open_access"
        return "check_access"

    if domain in FREE_TO_READ_DOMAINS:
        return "free_to_read"

    if domain in LIKELY_PAYWALLED_DOMAINS:
        return "check_access"

    # Default: needs checking
    return "check_access"


# ---- DOI extraction ----

DOI_PATTERNS = [
    r"10\.\d{4,}/[^\s\"'<>]+",  # standard DOI in URL
]


def extract_doi(url):
    """Try to extract a DOI from the URL."""
    # PLOS
    m = re.search(r"id=(10\.\d{4,}/[^\s&]+)", url)
    if m:
        return m.group(1)
    # Direct DOI in path
    m = re.search(r"/doi/(10\.\d{4,}/[^\s?#]+)", url)
    if m:
        return m.group(1)
    # NBER working paper number -> not a DOI but useful
    # PMC article -> no direct DOI in URL
    return None


# ---- ID generation ----

def make_id(title):
    """Generate a URL-safe slug from a title."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    # Truncate to reasonable length
    if len(slug) > 80:
        slug = slug[:80].rsplit("-", 1)[0]
    return slug


# ---- Tag generation ----

TAG_KEYWORDS = {
    # Methods
    "randomized": "RCT",
    "randomised": "RCT",
    "rct": "RCT",
    "randomized control trial": "RCT",
    "difference-in-differences": "diff-in-diff",
    "regression discontinuity": "regression-discontinuity",
    "instrumental variable": "instrumental-variables",
    "quasi-experimental": "quasi-experimental",
    "systematic review": "systematic-review",
    "meta-analysis": "meta-analysis",
    "scoping review": "scoping-review",
    "mixed-methods": "mixed-methods",
    "qualitative": "qualitative",
    "ethnograph": "ethnography",
    "survey": "survey-data",
    "panel data": "panel-data",
    "longitudinal": "longitudinal",

    # Regions
    "south asia": "South-Asia",
    "india": "India",
    "bangladesh": "Bangladesh",
    "pakistan": "Pakistan",
    "nepal": "Nepal",
    "sri lanka": "Sri-Lanka",
    "afghanistan": "Afghanistan",
    "sub-saharan africa": "Sub-Saharan-Africa",
    "southeast asia": "Southeast-Asia",
    "latin america": "Latin-America",

    # Themes
    "microfinance": "microfinance",
    "microcredit": "microfinance",
    "cash transfer": "cash-transfers",
    "conditional cash": "cash-transfers",
    "unconditional cash": "cash-transfers",
    "universal basic income": "UBI",
    "social protection": "social-protection",
    "health insurance": "health-insurance",
    "universal health coverage": "UHC",
    "community health worker": "CHWs",
    "maternal": "maternal-health",
    "child mortality": "child-health",
    "nutrition": "nutrition",
    "stunting": "nutrition",
    "sanitation": "WASH",
    "water supply": "WASH",
    "climate change": "climate-change",
    "adaptation": "climate-adaptation",
    "carbon": "carbon-emissions",
    "renewable energy": "renewable-energy",
    "biodiversity": "biodiversity",
    "deforestation": "deforestation",
    "women's empowerment": "womens-empowerment",
    "gender": "gender",
    "girls' education": "girls-education",
    "child marriage": "child-marriage",
    "domestic violence": "GBV",
    "gender-based violence": "GBV",
    "caste": "caste",
    "indigenous": "indigenous-peoples",
    "disability": "disability",
    "digital": "digital",
    "mobile": "mobile-technology",
    "artificial intelligence": "AI",
    "machine learning": "machine-learning",
    "big data": "big-data",
    "aadhaar": "Aadhaar",
    "governance": "governance",
    "corruption": "corruption",
    "decentralization": "decentralization",
    "panchayat": "local-governance",
    "institutions": "institutions",
    "colonial": "colonial-legacy",
    "poverty": "poverty",
    "inequality": "inequality",
    "ultra-poor": "ultra-poor",
    "graduation": "graduation-approach",
    "agriculture": "agriculture",
    "irrigation": "irrigation",
    "food security": "food-security",
    "migration": "migration",
    "urbanization": "urbanization",
    "slum": "urban-poverty",
    "education": "education",
    "school": "education",
    "literacy": "education",
    "employment": "employment",
    "labor market": "labor-markets",
    "informal sector": "informal-economy",
    "self-help group": "SHGs",
    "cooperativ": "cooperatives",
    "supply chain": "supply-chains",
    "value chain": "value-chains",
    "monitoring and evaluation": "M&E",
    "impact evaluation": "impact-evaluation",
    "theory of change": "theory-of-change",
    "cost-effectiveness": "cost-effectiveness",
    "cost-benefit": "cost-benefit",
}


def generate_tags(title, description, topic):
    """Generate tags from title and description using keyword matching."""
    text = f"{title} {description}".lower()
    tags = set()

    for keyword, tag in TAG_KEYWORDS.items():
        if keyword in text:
            tags.add(tag)

    # Always include a normalized topic tag
    topic_tag = topic.lower().replace(" & ", "-").replace(" ", "-")
    tags.add(topic_tag)

    return sorted(tags)


# ---- Main enrichment ----

def enrich_file(filepath, dry_run=False):
    """Enrich a single topic file with new fields."""
    with open(filepath, "r", encoding="utf-8") as f:
        resources = json.load(f)

    id_counts = {}
    changes = 0

    for r in resources:
        # Generate ID
        base_id = make_id(r["title"])
        if base_id in id_counts:
            id_counts[base_id] += 1
            r["id"] = f"{base_id}-{id_counts[base_id]}"
        else:
            id_counts[base_id] = 0
            r["id"] = base_id

        # Classify access
        r["access_type"] = classify_access(r.get("url", ""))

        # Extract DOI
        doi = extract_doi(r.get("url", ""))
        if doi:
            r["doi"] = doi

        # Generate tags
        r["tags"] = generate_tags(
            r.get("title", ""),
            r.get("description", ""),
            r.get("topic", ""),
        )

        # Mark as unverified
        r["verified"] = False

        changes += 1

    if not dry_run:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(resources, f, indent=2, ensure_ascii=False)

    return len(resources), changes


def main():
    dry_run = "--dry-run" in sys.argv

    pattern = os.path.join(TOPICS_DIR, "*.json")
    files = sorted(glob.glob(pattern))

    if not files:
        print(f"No topic files found in {TOPICS_DIR}")
        sys.exit(1)

    total = 0
    for filepath in files:
        filename = os.path.basename(filepath)
        count, changes = enrich_file(filepath, dry_run=dry_run)
        print(f"  {filename}: {count} resources enriched")
        total += count

    # Show access type summary
    if not dry_run:
        print(f"\nEnriched {total} resources across {len(files)} files.")
        # Count access types
        access_counts = {"open_access": 0, "free_to_read": 0, "check_access": 0}
        for filepath in files:
            with open(filepath, "r", encoding="utf-8") as f:
                for r in json.load(f):
                    at = r.get("access_type", "check_access")
                    access_counts[at] = access_counts.get(at, 0) + 1
        print("\nAccess type breakdown:")
        for at, count in sorted(access_counts.items()):
            print(f"  {at:20s} {count:4d}")
    else:
        print(f"\nDry run: would enrich {total} resources. No files written.")


if __name__ == "__main__":
    main()
