# Development Discourses - build & maintenance tasks
# Pure standard-library Python; no third-party runtime dependencies.

PYTHON ?= python3
PORT   ?= 8000

.DEFAULT_GOAL := help

.PHONY: help build enrich assets stats validate verify recheck contrast serve test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

build: ## Enrich topic files, merge into resources.json, generate assets
	$(PYTHON) enrich_data.py
	$(PYTHON) build.py --stats

enrich: ## Add ids, access types, tags to topic files
	$(PYTHON) enrich_data.py

assets: ## Regenerate sitemap.xml, feed.json, opensearch.xml, stats.json
	$(PYTHON) generate_assets.py

stats: ## Print library statistics
	$(PYTHON) build.py --stats --dry-run

validate: ## Validate topic files without writing
	$(PYTHON) build.py --validate --dry-run

verify: ## Check every resource URL and record what came back
	$(PYTHON) verify_urls.py

recheck: ## Re-check only the URLs that were not ok last time
	$(PYTHON) verify_urls.py --recheck

contrast: ## Measure every ink token against every surface, both themes
	$(PYTHON) check_contrast.py

serve: ## Serve the site locally at http://localhost:$(PORT)
	$(PYTHON) -m http.server $(PORT)

test: ## Run the test suite
	$(PYTHON) -m pytest -q

clean: ## Remove generated report artifacts
	rm -f url_verification_report.json
