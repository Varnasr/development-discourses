/**
 * Development Discourses - Library Frontend
 * ImpactMojo (impactmojo.in)
 */

(function () {
    'use strict';

    // State
    let allResources = [];
    let filteredResources = [];
    let currentTopic = 'all';
    let currentType = 'all';
    let currentSort = 'title';
    let currentSearch = '';
    let currentView = 'list';
    let displayCount = 50;
    const PAGE_SIZE = 50;

    // DOM refs
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const topicFilters = document.getElementById('topicFilters');
    const typeFilters = document.getElementById('typeFilters');
    const sortSelect = document.getElementById('sortSelect');
    const resourcesList = document.getElementById('resourcesList');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const resetFilters = document.getElementById('resetFilters');
    const aboutTopics = document.getElementById('aboutTopics');

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
            resourcesList.innerHTML = '<p style="padding:24px;color:#8a8a8a;">Could not load resources. Make sure data/resources.json exists.</p>';
            return;
        }

        updateStats();
        buildTopicFilters();
        buildAboutTopics();

        // Check for search param from detail page tag links
        const params = new URLSearchParams(window.location.search);
        const searchParam = params.get('search');
        if (searchParam) {
            searchInput.value = searchParam;
            currentSearch = searchParam.toLowerCase();
            clearSearch.classList.add('visible');
        }

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
        const topics = [...new Set(allResources.map(r => r.topic))].sort();
        topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'pill';
            btn.dataset.filter = topic;
            btn.textContent = topic;
            topicFilters.appendChild(btn);
        });
    }

    function buildAboutTopics() {
        const topics = [...new Set(allResources.map(r => r.topic))].sort();
        aboutTopics.innerHTML = topics.map(t => `<span class="topic-tag">${t}</span>`).join('');
    }

    function bindEvents() {
        // Search
        searchInput.addEventListener('input', debounce(function () {
            currentSearch = this.value.trim().toLowerCase();
            clearSearch.classList.toggle('visible', currentSearch.length > 0);
            displayCount = PAGE_SIZE;
            applyFilters();
        }, 200));

        clearSearch.addEventListener('click', function () {
            searchInput.value = '';
            currentSearch = '';
            clearSearch.classList.remove('visible');
            displayCount = PAGE_SIZE;
            applyFilters();
        });

        // Topic filters
        topicFilters.addEventListener('click', function (e) {
            if (!e.target.classList.contains('pill')) return;
            topicFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentTopic = e.target.dataset.filter;
            displayCount = PAGE_SIZE;
            applyFilters();
        });

        // Type filters
        typeFilters.addEventListener('click', function (e) {
            if (!e.target.classList.contains('pill')) return;
            typeFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentType = e.target.dataset.filter;
            displayCount = PAGE_SIZE;
            applyFilters();
        });

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
            });
        });

        // Load more
        loadMoreBtn.addEventListener('click', function () {
            displayCount += PAGE_SIZE;
            renderResources();
        });

        // Reset
        resetFilters.addEventListener('click', function () {
            searchInput.value = '';
            currentSearch = '';
            currentTopic = 'all';
            currentType = 'all';
            currentSort = 'title';
            sortSelect.value = 'title';
            clearSearch.classList.remove('visible');
            topicFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            topicFilters.querySelector('[data-filter="all"]').classList.add('active');
            typeFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            typeFilters.querySelector('[data-filter="all"]').classList.add('active');
            displayCount = PAGE_SIZE;
            applyFilters();
        });

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

    function applyFilters() {
        filteredResources = allResources.filter(r => {
            if (currentTopic !== 'all' && r.topic !== currentTopic) return false;
            if (currentType !== 'all' && r.type !== currentType) return false;
            if (currentSearch) {
                const haystack = `${r.title} ${r.authors} ${r.description} ${r.topic}`.toLowerCase();
                const terms = currentSearch.split(/\s+/);
                if (!terms.every(term => haystack.includes(term))) return false;
            }
            return true;
        });

        sortResources();
        renderResources();
    }

    function sortResources() {
        filteredResources.sort((a, b) => {
            switch (currentSort) {
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

    function renderResources() {
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
            const accessLabel = accessClass === 'open_access' ? 'Open Access'
                : accessClass === 'free_to_read' ? 'Free to Read' : 'Check Access';

            card.innerHTML = `
                <div class="resource-card-header">
                    <span class="resource-type-badge ${typeClass}">${typeLabel}</span>
                    <span class="resource-title">${escapeHtml(r.title)}</span>
                </div>
                <div class="resource-meta">
                    <span class="resource-authors">${escapeHtml(r.authors || 'Unknown')}</span>
                    ${r.year ? `<span class="resource-year">${r.year}</span>` : ''}
                </div>
                ${r.description ? `<p class="resource-description">${escapeHtml(r.description)}</p>` : ''}
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

        // Load more visibility
        loadMoreContainer.style.display = displayCount < filteredResources.length ? 'block' : 'none';
    }

    // Utilities
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();
