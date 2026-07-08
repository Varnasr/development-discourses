/**
 * Development Discourses - Library Frontend
 * ImpactMojo (impactmojo.in)
 *
 * Vanilla JS, zero dependencies. Handles search, multi-facet filtering,
 * URL-synced state, export, and result rendering.
 */

(function () {
    'use strict';

    // State
    let allResources = [];
    let filteredResources = [];
    let currentTopic = 'all';
    let currentType = 'all';
    let currentAccess = 'all';
    let currentDecade = 'all';
    let currentSort = 'title';
    let currentSearch = '';
    let currentView = 'list';
    let displayCount = 50;
    const PAGE_SIZE = 50;
    const RECENT_KEY = 'imx_recent';

    // DOM refs
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const topicFilters = document.getElementById('topicFilters');
    const typeFilters = document.getElementById('typeFilters');
    const accessFilters = document.getElementById('accessFilters');
    const decadeFilters = document.getElementById('decadeFilters');
    const activeFilters = document.getElementById('activeFilters');
    const sortSelect = document.getElementById('sortSelect');
    const resourcesList = document.getElementById('resourcesList');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const resetFilters = document.getElementById('resetFilters');
    const aboutTopics = document.getElementById('aboutTopics');
    const randomBtn = document.getElementById('randomBtn');
    const exportBtn = document.getElementById('exportBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    const backToTop = document.getElementById('backToTop');

    // Stats
    const totalCount = document.getElementById('totalCount');
    const paperCount = document.getElementById('paperCount');
    const bookCount = document.getElementById('bookCount');
    const greyCount = document.getElementById('greyCount');
    const topicCount = document.getElementById('topicCount');

    // Init
    async function init() {
        showLoadingSkeleton();
        try {
            const response = await fetch('data/resources.json');
            allResources = await response.json();
        } catch (e) {
            console.error('Failed to load resources:', e);
            resourcesList.innerHTML = '<p style="padding:24px;color:var(--color-text-muted);">Could not load resources. Make sure data/resources.json exists.</p>';
            return;
        }

        updateStats();
        buildTopicFilters();
        buildDecadeFilters();
        buildAboutTopics();
        readStateFromURL();

        applyFilters();
        bindEvents();
    }

    function showLoadingSkeleton() {
        let html = '';
        for (let i = 0; i < 8; i++) {
            html += '<div class="loading-skeleton" style="margin-bottom:4px;"></div>';
        }
        resourcesList.innerHTML = html;
    }

    function updateStats() {
        totalCount.textContent = allResources.length;
        paperCount.textContent = allResources.filter(r => r.type === 'paper').length;
        bookCount.textContent = allResources.filter(r => r.type === 'book').length;
        greyCount.textContent = allResources.filter(r => r.type === 'grey_literature').length;
        const topics = new Set(allResources.map(r => r.topic));
        topicCount.textContent = topics.size;
    }

    function buildTopicFilters() {
        const counts = {};
        allResources.forEach(r => { counts[r.topic] = (counts[r.topic] || 0) + 1; });
        const topics = Object.keys(counts).sort();
        topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'pill';
            btn.dataset.filter = topic;
            btn.innerHTML = `${escapeHtml(topic)} <span class="pill-count">${counts[topic]}</span>`;
            topicFilters.appendChild(btn);
        });
    }

    function buildDecadeFilters() {
        const decades = new Set();
        allResources.forEach(r => {
            if (r.year) decades.add(decadeOf(r.year));
        });
        // Sort newest first
        const sorted = [...decades].sort((a, b) => b - a);
        sorted.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'pill';
            btn.dataset.filter = String(d);
            btn.textContent = d < 2000 ? 'Pre-2000' : d + 's';
            decadeFilters.appendChild(btn);
        });
    }

    function decadeOf(year) {
        if (year < 2000) return 1990; // bucket everything pre-2000 together
        return Math.floor(year / 10) * 10;
    }

    function buildAboutTopics() {
        const topics = [...new Set(allResources.map(r => r.topic))].sort();
        aboutTopics.innerHTML = topics.map(t =>
            `<a class="topic-tag" href="?topic=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`
        ).join('');
    }

    // ---- URL state ----
    function readStateFromURL() {
        const p = new URLSearchParams(window.location.search);
        const search = p.get('search') || p.get('q');
        if (search) {
            currentSearch = search.toLowerCase();
            searchInput.value = search;
            clearSearch.classList.add('visible');
        }
        if (p.get('topic')) currentTopic = p.get('topic');
        if (p.get('type')) currentType = p.get('type');
        if (p.get('access')) currentAccess = p.get('access');
        if (p.get('decade')) currentDecade = p.get('decade');
        if (p.get('sort')) currentSort = p.get('sort');
        if (p.get('view') === 'grid') currentView = 'grid';

        // Default sort to relevance when there is a search term
        if (currentSearch && !p.get('sort')) currentSort = 'relevance';

        // Reflect into controls
        sortSelect.value = currentSort;
        setActivePill(topicFilters, currentTopic);
        setActivePill(typeFilters, currentType);
        setActivePill(accessFilters, currentAccess);
        setActivePill(decadeFilters, currentDecade);
        if (currentView === 'grid') {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'grid'));
            resourcesList.classList.add('grid-view');
        }
    }

    function setActivePill(container, value) {
        if (!container) return;
        let matched = false;
        container.querySelectorAll('.pill').forEach(p => {
            const on = p.dataset.filter === value;
            p.classList.toggle('active', on);
            if (on) matched = true;
        });
        if (!matched) {
            const fallback = container.querySelector('[data-filter="all"]');
            if (fallback) fallback.classList.add('active');
        }
    }

    function writeStateToURL() {
        const p = new URLSearchParams();
        if (currentSearch) p.set('q', searchInput.value.trim());
        if (currentTopic !== 'all') p.set('topic', currentTopic);
        if (currentType !== 'all') p.set('type', currentType);
        if (currentAccess !== 'all') p.set('access', currentAccess);
        if (currentDecade !== 'all') p.set('decade', currentDecade);
        if (currentSort !== 'title' && currentSort !== 'relevance') p.set('sort', currentSort);
        if (currentView === 'grid') p.set('view', 'grid');
        const qs = p.toString();
        const url = qs ? '?' + qs : window.location.pathname;
        window.history.replaceState(null, '', url);
    }

    function bindEvents() {
        // Search
        searchInput.addEventListener('input', debounce(function () {
            currentSearch = this.value.trim().toLowerCase();
            clearSearch.classList.toggle('visible', currentSearch.length > 0);
            if (currentSearch && sortSelect.value === 'title') {
                currentSort = 'relevance';
                sortSelect.value = 'relevance';
            }
            displayCount = PAGE_SIZE;
            applyFilters();
        }, 180));

        clearSearch.addEventListener('click', function () {
            searchInput.value = '';
            currentSearch = '';
            clearSearch.classList.remove('visible');
            displayCount = PAGE_SIZE;
            searchInput.focus();
            applyFilters();
        });

        // Facet pill groups
        bindPillGroup(topicFilters, v => { currentTopic = v; });
        bindPillGroup(typeFilters, v => { currentType = v; });
        bindPillGroup(accessFilters, v => { currentAccess = v; });
        bindPillGroup(decadeFilters, v => { currentDecade = v; });

        // Sort
        sortSelect.addEventListener('change', function () {
            currentSort = this.value;
            applyFilters();
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentView = this.dataset.view;
                resourcesList.classList.toggle('grid-view', currentView === 'grid');
                writeStateToURL();
            });
        });

        // Load more
        loadMoreBtn.addEventListener('click', function () {
            displayCount += PAGE_SIZE;
            renderResources();
        });

        // Reset
        resetFilters.addEventListener('click', resetAll);

        // Random resource
        if (randomBtn) randomBtn.addEventListener('click', function () {
            const pool = filteredResources.length ? filteredResources : allResources;
            if (!pool.length) return;
            const r = pool[Math.floor(Math.random() * pool.length)];
            window.location.href = r.id ? 'resource.html?id=' + encodeURIComponent(r.id) : r.url;
        });

        // Export
        if (exportBtn) {
            exportBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                const open = exportDropdown.style.display === 'block';
                exportDropdown.style.display = open ? 'none' : 'block';
                exportBtn.setAttribute('aria-expanded', String(!open));
            });
            exportDropdown.querySelectorAll('button').forEach(b => {
                b.addEventListener('click', function () {
                    exportResources(this.dataset.export);
                    exportDropdown.style.display = 'none';
                    exportBtn.setAttribute('aria-expanded', 'false');
                });
            });
            document.addEventListener('click', function () {
                exportDropdown.style.display = 'none';
                exportBtn.setAttribute('aria-expanded', 'false');
            });
        }

        // Back to top
        if (backToTop) {
            window.addEventListener('scroll', throttle(function () {
                backToTop.classList.toggle('visible', window.scrollY > 600);
            }, 200));
            backToTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Keyboard shortcut: focus search with /
        document.addEventListener('keydown', function (e) {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
            if (e.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.blur();
            }
        });
    }

    function bindPillGroup(container, setter) {
        if (!container) return;
        container.addEventListener('click', function (e) {
            const pill = e.target.closest('.pill');
            if (!pill) return;
            container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            setter(pill.dataset.filter);
            displayCount = PAGE_SIZE;
            applyFilters();
        });
    }

    function resetAll() {
        searchInput.value = '';
        currentSearch = '';
        currentTopic = 'all';
        currentType = 'all';
        currentAccess = 'all';
        currentDecade = 'all';
        currentSort = 'title';
        sortSelect.value = 'title';
        clearSearch.classList.remove('visible');
        [topicFilters, typeFilters, accessFilters, decadeFilters].forEach(c => setActivePill(c, 'all'));
        displayCount = PAGE_SIZE;
        applyFilters();
    }

    function applyFilters() {
        const terms = currentSearch ? currentSearch.split(/\s+/).filter(Boolean) : [];

        filteredResources = allResources.filter(r => {
            if (currentTopic !== 'all' && r.topic !== currentTopic) return false;
            if (currentType !== 'all' && r.type !== currentType) return false;
            if (currentAccess !== 'all' && (r.access_type || 'check_access') !== currentAccess) return false;
            if (currentDecade !== 'all' && r.year && String(decadeOf(r.year)) !== currentDecade) return false;
            if (currentDecade !== 'all' && !r.year) return false;
            if (terms.length) {
                const haystack = `${r.title} ${r.authors} ${r.description} ${r.topic} ${(r.tags || []).join(' ')}`.toLowerCase();
                if (!terms.every(term => haystack.includes(term))) return false;
            }
            return true;
        });

        sortResources(terms);
        renderActiveFilters();
        renderResources(terms);
        writeStateToURL();
    }

    function relevanceScore(r, terms) {
        const title = (r.title || '').toLowerCase();
        const authors = (r.authors || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        let score = 0;
        terms.forEach(t => {
            if (title.includes(t)) score += 10;
            if (title.startsWith(t)) score += 5;
            if (authors.includes(t)) score += 4;
            if (desc.includes(t)) score += 1;
        });
        if (r.access_type === 'open_access') score += 0.5;
        return score;
    }

    function sortResources(terms) {
        filteredResources.sort((a, b) => {
            switch (currentSort) {
                case 'relevance':
                    if (terms && terms.length) {
                        const d = relevanceScore(b, terms) - relevanceScore(a, terms);
                        if (d !== 0) return d;
                    }
                    return a.title.localeCompare(b.title);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'year-desc':
                    return (b.year || 0) - (a.year || 0);
                case 'year-asc':
                    return (a.year || 0) - (b.year || 0);
                case 'author':
                    return (a.authors || '').localeCompare(b.authors || '');
                default:
                    return 0;
            }
        });
    }

    function renderActiveFilters() {
        const chips = [];
        if (currentTopic !== 'all') chips.push({ k: 'topic', label: currentTopic });
        if (currentType !== 'all') chips.push({ k: 'type', label: typeLabelOf(currentType) });
        if (currentAccess !== 'all') chips.push({ k: 'access', label: accessLabelOf(currentAccess) });
        if (currentDecade !== 'all') chips.push({ k: 'decade', label: currentDecade < 2000 ? 'Pre-2000' : currentDecade + 's' });
        if (currentSearch) chips.push({ k: 'search', label: '"' + searchInput.value.trim() + '"' });

        if (!chips.length) {
            activeFilters.style.display = 'none';
            activeFilters.innerHTML = '';
            return;
        }
        activeFilters.style.display = 'flex';
        activeFilters.innerHTML =
            chips.map(c => `<button class="filter-chip" data-clear="${c.k}">${escapeHtml(c.label)} <span aria-hidden="true">&times;</span></button>`).join('') +
            '<button class="filter-chip filter-chip-clear" data-clear="allfilters">Clear all</button>';

        activeFilters.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', function () {
                const k = this.dataset.clear;
                if (k === 'allfilters') { resetAll(); return; }
                if (k === 'topic') { currentTopic = 'all'; setActivePill(topicFilters, 'all'); }
                if (k === 'type') { currentType = 'all'; setActivePill(typeFilters, 'all'); }
                if (k === 'access') { currentAccess = 'all'; setActivePill(accessFilters, 'all'); }
                if (k === 'decade') { currentDecade = 'all'; setActivePill(decadeFilters, 'all'); }
                if (k === 'search') { currentSearch = ''; searchInput.value = ''; clearSearch.classList.remove('visible'); }
                displayCount = PAGE_SIZE;
                applyFilters();
            });
        });
    }

    function renderResources(terms) {
        terms = terms || (currentSearch ? currentSearch.split(/\s+/).filter(Boolean) : []);
        const toShow = filteredResources.slice(0, displayCount);

        if (filteredResources.length === 0) {
            resourcesList.innerHTML = '';
            noResults.style.display = 'block';
            loadMoreContainer.style.display = 'none';
            resultsCount.textContent = 'No resources found';
            return;
        }

        noResults.style.display = 'none';
        resultsCount.textContent = `Showing ${toShow.length} of ${filteredResources.length} resources`;

        const fragment = document.createDocumentFragment();

        toShow.forEach(r => {
            const card = document.createElement('a');
            card.className = 'resource-card';
            card.href = r.id ? 'resource.html?id=' + encodeURIComponent(r.id) : r.url;
            if (!r.id) {
                card.target = '_blank';
                card.rel = 'noopener';
            }

            const typeClass = r.type || 'paper';
            const typeLabel = r.type === 'grey_literature' ? 'Grey Lit' : capitalize(r.type);
            const accessClass = r.access_type || 'check_access';
            const accessLabel = accessLabelOf(accessClass);

            card.innerHTML = `
                <div class="resource-card-header">
                    <span class="resource-type-badge ${typeClass}">${typeLabel}</span>
                    <span class="resource-title">${highlight(r.title, terms)}</span>
                </div>
                <div class="resource-meta">
                    <span class="resource-authors">${highlight(r.authors || 'Unknown', terms)}</span>
                    ${r.year ? `<span class="resource-year">${r.year}</span>` : ''}
                    <span class="resource-access access-dot-${accessClass}" title="${accessLabel}">${accessLabel}</span>
                </div>
                ${r.description ? `<p class="resource-description">${highlight(truncate(r.description, 220), terms)}</p>` : ''}
                <div class="resource-footer">
                    <span class="resource-topic-tag">${escapeHtml(r.topic)}</span>
                    <div class="resource-footer-right">
                        ${(r.tags && r.tags.length > 0) ? `<span class="resource-tag-count">${r.tags.length} tags</span>` : ''}
                        <span class="resource-link-icon">View &rarr;</span>
                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });

        resourcesList.innerHTML = '';
        resourcesList.appendChild(fragment);

        loadMoreContainer.style.display = displayCount < filteredResources.length ? 'block' : 'none';
    }

    // ---- Export ----
    function exportResources(format) {
        if (!filteredResources.length) return;
        let content, mime, filename;
        if (format === 'bibtex') {
            content = filteredResources.map(toBibTeX).join('\n\n');
            mime = 'application/x-bibtex';
            filename = 'development-discourses.bib';
        } else if (format === 'csv') {
            content = toCSV(filteredResources);
            mime = 'text/csv';
            filename = 'development-discourses.csv';
        } else {
            content = JSON.stringify(filteredResources, null, 2);
            mime = 'application/json';
            filename = 'development-discourses.json';
        }
        downloadFile(content, mime, filename);
    }

    function toBibTeX(r) {
        const key = (r.id || 'resource').replace(/[^a-z0-9]+/gi, '_').substring(0, 32);
        const entryType = r.type === 'book' ? 'book' : (r.type === 'grey_literature' ? 'techreport' : 'article');
        return `@${entryType}{${key},
  author = {${r.authors || 'Unknown'}},
  title = {${r.title}},
  year = {${r.year || ''}},
  howpublished = {${escapeBib(r.topic)}},
  url = {${r.url}}${r.doi ? `,\n  doi = {${r.doi}}` : ''}
}`;
    }

    function escapeBib(s) { return (s || '').replace(/[{}]/g, ''); }

    function toCSV(rows) {
        const headers = ['title', 'authors', 'year', 'type', 'topic', 'access_type', 'url', 'description'];
        const esc = v => {
            const s = String(v === undefined || v === null ? '' : v);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const lines = [headers.join(',')];
        rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(',')));
        return lines.join('\n');
    }

    function downloadFile(content, mime, filename) {
        const blob = new Blob([content], { type: mime + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ---- Labels ----
    function typeLabelOf(t) {
        return t === 'grey_literature' ? 'Grey Literature' : capitalize(t);
    }
    function accessLabelOf(a) {
        return a === 'open_access' ? 'Open Access'
            : a === 'free_to_read' ? 'Free to Read' : 'Check Access';
    }

    // ---- Utilities ----
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    function highlight(str, terms) {
        const safe = escapeHtml(str);
        if (!terms || !terms.length) return safe;
        const escaped = terms
            .filter(t => t.length > 1)
            .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .sort((a, b) => b.length - a.length);
        if (!escaped.length) return safe;
        const re = new RegExp('(' + escaped.join('|') + ')', 'gi');
        return safe.replace(re, '<mark>$1</mark>');
    }

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len).trimEnd() + '…' : str;
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function throttle(fn, wait) {
        let last = 0, timer;
        return function (...args) {
            const now = Date.now();
            const remaining = wait - (now - last);
            if (remaining <= 0) {
                clearTimeout(timer);
                last = now;
                fn.apply(this, args);
            } else if (!timer) {
                timer = setTimeout(() => {
                    last = Date.now();
                    timer = null;
                    fn.apply(this, args);
                }, remaining);
            }
        };
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();
