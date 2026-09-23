/**
 * resource.js - Detail page for individual resources
 * Development Discourses | ImpactMojo
 */

(function () {
    'use strict';

    let allResources = [];
    let currentResource = null;
    let currentCiteFormat = 'apa';

    // ---- Init ----
    async function init() {
        const params = new URLSearchParams(window.location.search);
        const resourceId = params.get('id');

        if (!resourceId) {
            showError('No resource specified.');
            return;
        }

        try {
            const response = await fetch('data/resources.json');
            allResources = await response.json();
        } catch (e) {
            showError('Could not load resources.');
            return;
        }

        currentResource = allResources.find(r => r.id === resourceId);

        if (!currentResource) {
            showError('Resource not found: ' + escapeHtml(resourceId));
            return;
        }

        renderResource();
        injectSEO();
        renderMetadata();
        renderTags();
        renderCitation();
        renderRelated();
        renderRecentlyViewed();
        recordVisit();
        // Render interactive LitMaps-style graph
        if (window.renderLitmap) {
            window.renderLitmap(currentResource, allResources);
        }
        bindEvents();
        initReadingProgress();
    }

    // ---- Reading progress bar ----
    function initReadingProgress() {
        const bar = document.getElementById('reading-progress');
        if (!bar) return;
        const fill = bar.firstElementChild;
        function update() {
            const doc = document.documentElement;
            const scrollable = doc.scrollHeight - doc.clientHeight;
            const pct = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0;
            if (fill) fill.style.width = pct + '%';
            bar.classList.toggle('visible', window.scrollY > 60);
        }
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }

    // ---- Render Main ----
    function renderResource() {
        const r = currentResource;

        document.title = r.title + ' | Development Discourses';

        // Breadcrumb
        document.getElementById('breadcrumbTopic').textContent = r.topic;
        document.getElementById('breadcrumbTitle').textContent = truncate(r.title, 60);

        // Header
        const typeBadge = document.getElementById('typeBadge');
        typeBadge.textContent = r.type === 'grey_literature' ? 'Grey Lit' : capitalize(r.type);
        typeBadge.className = 'resource-type-badge ' + (r.type || 'paper');

        // Access badge
        const accessBadge = document.getElementById('accessBadge');
        const accessInfo = getAccessInfo(r.access_type);
        accessBadge.textContent = accessInfo.label;
        accessBadge.className = 'access-badge access-' + r.access_type;

        // Link health.
        //
        // This used to be a "Verified" badge driven by `r.verified`, and it
        // could never appear: enrich_data.py set that field to false on every
        // resource on every build, so the branch was unreachable. Worse, the
        // word promised an editorial judgement the pipeline never made.
        //
        // What the checker actually knows is narrower and more useful: whether
        // the link answered. It also distinguishes a publisher refusing a robot
        // (403, which a reader never sees) from a document that is gone (404),
        // which the previous checker did not, and that distinction is the whole
        // reason a reader can trust the line.
        renderLinkStatus(r);

        document.getElementById('detailTitle').textContent = r.title;
        document.getElementById('detailAuthors').textContent = r.authors || 'Unknown';
        document.getElementById('detailYear').textContent = r.year || '';
        document.getElementById('detailTopic').innerHTML = topicsOf(r)
            .map(t => `<a class="detail-topic-tag" href="index.html?topic=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`)
            .join('');
        document.getElementById('detailDescription').textContent = r.description || 'No description available.';

        // Source link
        document.getElementById('readSourceBtn').href = r.url;

        // Some records carry a second link, usually a working paper beside the
        // published version. The build used to keep only one of the two, and
        // dropped the other entry entirely.
        renderAltUrls(r);

        // Community notes link
        const noteUrl = 'https://github.com/Varnasr/development-discourses/issues/new?title=' +
            encodeURIComponent('Community Note: ' + r.title) +
            '&labels=community-note&body=' +
            encodeURIComponent('## Community Note\n\n**Resource:** ' + r.title + '\n**ID:** ' + r.id + '\n\n### Note\n\n(Write your note here — reading tips, practitioner context, critiques, related resources...)\n');
        document.getElementById('contributeNote').href = noteUrl;
    }


    // A resource can be filed under more than one topic. `topic` is the first
    // and stays for anything reading a scalar; `topics` is the full list.
    function topicsOf(r) {
        return (r.topics && r.topics.length) ? r.topics : (r.topic ? [r.topic] : []);
    }

    const LINK_COPY = {
        ok: { cls: 'link-ok', text: 'Link checked' },
        paywalled: { cls: 'link-warn', text: 'Publisher landing page' },
        blocked: { cls: 'link-warn', text: 'Not confirmed from here' },
        unknown: { cls: 'link-warn', text: 'Did not answer' },
        broken: { cls: 'link-bad', text: 'Link was unreachable' },
    };

    const LINK_DETAIL = {
        ok: 'The library reached this document on {date}.',
        paywalled: 'This host answers with a publisher landing page. The text may be ' +
                   'open access behind it, but the library cannot confirm that from here. ' +
                   'Last checked {date}.',
        blocked: 'This publisher refuses automated requests, so the library could not ' +
                 'check the link on {date}. That is not a sign the document is gone: ' +
                 'it will almost certainly open in your browser.',
        unknown: 'The host did not answer when the library checked on {date}. ' +
                 'Usually temporary. Worth trying.',
        broken: 'This link returned "not found" when the library checked on {date}. ' +
                'The document has probably moved. The search links below may find it.',
    };

    function renderLinkStatus(r) {
        const el = document.getElementById('linkBadge');
        if (!el) { return; }
        const copy = LINK_COPY[r.link_status];
        if (!copy) { el.hidden = true; return; }
        const when = r.link_checked || 'an earlier run';
        el.hidden = false;
        el.className = 'link-badge ' + copy.cls;
        el.textContent = copy.text;
        el.title = LINK_DETAIL[r.link_status].replace('{date}', when);

        const note = document.getElementById('linkNote');
        if (!note) { return; }
        if (r.link_status === 'ok') { note.hidden = true; return; }
        note.hidden = false;
        note.className = 'link-note ' + copy.cls;
        let html = '<p>' + escapeHtml(LINK_DETAIL[r.link_status].replace('{date}', when)) + '</p>';
        if (r.link_status === 'broken') {
            const q = encodeURIComponent(r.title);
            html += '<p class="link-note-actions">' +
                (r.doi ? `<a href="https://doi.org/${encodeURIComponent(r.doi)}" rel="noopener">Resolve the DOI</a>` : '') +
                `<a href="https://scholar.google.com/scholar?q=${q}" rel="noopener" target="_blank">Search Google Scholar</a>` +
                `<a href="https://www.google.com/search?q=${q}" rel="noopener" target="_blank">Search the web</a>` +
                `<a href="https://web.archive.org/web/2024/${encodeURIComponent(r.url)}" rel="noopener" target="_blank">Try the Wayback Machine</a>` +
                '</p>';
        }
        note.innerHTML = html;
    }

    function renderAltUrls(r) {
        const el = document.getElementById('altUrls');
        if (!el) { return; }
        const alts = r.alt_urls || [];
        if (!alts.length) { el.hidden = true; return; }
        el.hidden = false;
        el.innerHTML = '<h3 class="alt-urls-title">Also available at</h3><ul>' +
            alts.map(u => `<li><a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(prettyUrl(u))}</a></li>`).join('') +
            '</ul>';
    }

    function prettyUrl(u) {
        try {
            const p = new URL(u);
            return p.hostname.replace(/^www\./, '') + (p.pathname.length > 1 ? p.pathname : '');
        } catch (e) { return u; }
    }

    // ---- Dynamic SEO / structured data ----
    function injectSEO() {
        const r = currentResource;
        const desc = (r.description || r.title).substring(0, 300);
        const pageUrl = window.location.href;

        setMeta('name', 'description', desc);
        setMeta('property', 'og:title', r.title);
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:url', pageUrl);
        setMeta('name', 'twitter:title', r.title);
        setMeta('name', 'twitter:description', desc);

        // Canonical
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = pageUrl;

        // JSON-LD
        const schemaType = r.type === 'book' ? 'Book'
            : r.type === 'grey_literature' ? 'Report' : 'ScholarlyArticle';
        const ld = {
            '@context': 'https://schema.org',
            '@type': schemaType,
            'name': r.title,
            'headline': r.title,
            'author': (r.authors || 'Unknown').split(/,\s*/).map(a => ({ '@type': 'Organization', 'name': a })),
            'datePublished': r.year ? String(r.year) : undefined,
            'description': r.description || undefined,
            'url': r.url,
            'about': r.topic,
            'keywords': (r.tags || []).join(', ') || undefined,
            'isAccessibleForFree': r.access_type === 'open_access' || r.access_type === 'free_to_read',
            'isPartOf': { '@type': 'CollectionPage', 'name': 'Development Discourses' },
        };
        if (r.doi) ld.identifier = 'https://doi.org/' + r.doi;

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(ld);
        document.head.appendChild(script);
    }

    function setMeta(attr, key, value) {
        let el = document.head.querySelector(`meta[${attr}="${key}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, key);
            document.head.appendChild(el);
        }
        el.setAttribute('content', value);
    }

    function getAccessInfo(accessType) {
        switch (accessType) {
            case 'open_access':
                return { label: 'Open Access', color: '#059669' };
            case 'free_to_read':
                return { label: 'Free to Read', color: '#2563eb' };
            case 'check_access':
                return { label: 'Check Access', color: '#d97706' };
            default:
                return { label: 'Unknown', color: '#6b6b6b' };
        }
    }

    // ---- Metadata Sidebar ----
    function renderMetadata() {
        const r = currentResource;
        const meta = document.getElementById('metaList');
        const items = [];

        items.push({ label: 'Authors', value: r.authors || 'Unknown' });
        items.push({ label: 'Year', value: r.year || 'N/A' });
        items.push({ label: 'Type', value: r.type === 'grey_literature' ? 'Grey Literature' : capitalize(r.type) });
        items.push({ label: 'Topic', value: r.topic });

        if (r.doi) {
            items.push({ label: 'DOI', value: r.doi, isLink: 'https://doi.org/' + r.doi });
        }

        const accessInfo = getAccessInfo(r.access_type);
        items.push({ label: 'Access', value: accessInfo.label });

        let domain = r.url;
        try { domain = new URL(r.url).hostname.replace('www.', ''); } catch (e) {}
        items.push({ label: 'Source', value: domain, isLink: r.url });

        meta.innerHTML = items.map(item => `
            <div class="meta-item">
                <dt>${escapeHtml(item.label)}</dt>
                <dd>${item.isLink
                    ? `<a href="${escapeHtml(item.isLink)}" target="_blank" rel="noopener">${escapeHtml(String(item.value))}</a>`
                    : escapeHtml(String(item.value))
                }</dd>
            </div>
        `).join('');
    }

    // ---- Tags ----
    function renderTags() {
        const tags = currentResource.tags || [];
        const tagList = document.getElementById('tagList');

        if (tags.length === 0) {
            document.getElementById('detailTags').style.display = 'none';
            return;
        }

        tagList.innerHTML = tags.map(tag =>
            `<a href="index.html?search=${encodeURIComponent(tag.replace(/-/g, ' '))}" class="detail-tag">${escapeHtml(tag)}</a>`
        ).join('');
    }

    // ---- Citation ----
    function renderCitation() {
        updateCitationContent();
    }

    function updateCitationContent() {
        const r = currentResource;
        const content = document.getElementById('citationContent');
        let text = '';

        switch (currentCiteFormat) {
            case 'apa':
                text = formatAPA(r);
                break;
            case 'bibtex':
                text = formatBibTeX(r);
                break;
            case 'chicago':
                text = formatChicago(r);
                break;
        }

        content.textContent = text;
    }

    function formatAPA(r) {
        const authors = r.authors || 'Unknown';
        const year = r.year ? `(${r.year})` : '(n.d.)';
        const title = r.title;
        const url = r.url;
        return `${authors} ${year}. ${title}. Retrieved from ${url}`;
    }

    function formatBibTeX(r) {
        const key = (r.id || 'resource').replace(/-/g, '_').substring(0, 30);
        const authorField = r.authors || 'Unknown';
        const entryType = r.type === 'book' ? 'book' : 'article';
        return `@${entryType}{${key},
  author = {${authorField}},
  title = {${r.title}},
  year = {${r.year || ''}},
  url = {${r.url}}${r.doi ? `,\n  doi = {${r.doi}}` : ''}
}`;
    }

    function formatChicago(r) {
        const authors = r.authors || 'Unknown';
        const year = r.year || 'n.d.';
        const title = `"${r.title}."`;
        return `${authors}. ${year}. ${title} ${r.url}.`;
    }

    // ---- Related Resources ----
    function renderRelated() {
        const r = currentResource;
        const container = document.getElementById('relatedList');

        // Score relatedness by shared tags, topic, and authors
        const scored = allResources
            .filter(other => other.id !== r.id)
            .map(other => {
                let score = 0;

                // Same topic: +3
                if (other.topic === r.topic) score += 3;

                // Shared tags
                const myTags = new Set(r.tags || []);
                (other.tags || []).forEach(t => {
                    if (myTags.has(t)) score += 2;
                });

                // Shared author words (surname matching)
                const myAuthors = (r.authors || '').toLowerCase().split(/[,&]+/).map(s => s.trim().split(/\s+/).pop());
                const otherAuthors = (other.authors || '').toLowerCase().split(/[,&]+/).map(s => s.trim().split(/\s+/).pop());
                myAuthors.forEach(a => {
                    if (a && otherAuthors.includes(a)) score += 4;
                });

                return { resource: other, score };
            })
            .filter(s => s.score > 2)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);

        if (scored.length === 0) {
            container.innerHTML = '<p class="related-empty">No closely related resources found.</p>';
            return;
        }

        container.innerHTML = scored.map(s => {
            const other = s.resource;
            return `
                <a href="resource.html?id=${encodeURIComponent(other.id)}" class="related-item">
                    <span class="related-title">${escapeHtml(truncate(other.title, 80))}</span>
                    <span class="related-meta">${escapeHtml(other.authors ? other.authors.split(',')[0] : '')}${other.year ? ', ' + other.year : ''}</span>
                </a>
            `;
        }).join('');
    }

    // ---- Recently Viewed (localStorage) ----
    const RECENT_KEY = 'imx_recent';
    const RECENT_MAX = 8;

    function readRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
        catch (e) { return []; }
    }

    function recordVisit() {
        if (!currentResource || !currentResource.id) return;
        try {
            let ids = readRecent().filter(id => id !== currentResource.id);
            ids.unshift(currentResource.id);
            ids = ids.slice(0, RECENT_MAX + 4);
            localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
        } catch (e) { /* storage unavailable */ }
    }

    function renderRecentlyViewed() {
        const card = document.getElementById('recentCard');
        const list = document.getElementById('recentList');
        if (!card || !list) return;

        const ids = readRecent().filter(id => id !== currentResource.id);
        const items = ids
            .map(id => allResources.find(r => r.id === id))
            .filter(Boolean)
            .slice(0, RECENT_MAX);

        if (items.length === 0) return;

        card.style.display = 'block';
        list.innerHTML = items.map(r => `
            <a href="resource.html?id=${encodeURIComponent(r.id)}" class="related-item">
                <span class="related-title">${escapeHtml(truncate(r.title, 80))}</span>
                <span class="related-meta">${escapeHtml(r.authors ? r.authors.split(',')[0] : '')}${r.year ? ', ' + r.year : ''}</span>
            </a>
        `).join('');
    }

    // ---- Events ----
    function bindEvents() {
        // Citation toggle
        document.getElementById('citeBtnToggle').addEventListener('click', function () {
            const panel = document.getElementById('citationPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Citation format tabs
        document.querySelectorAll('.citation-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.citation-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentCiteFormat = this.dataset.format;
                updateCitationContent();
            });
        });

        // Copy citation
        document.getElementById('citationCopy').addEventListener('click', function () {
            const text = document.getElementById('citationContent').textContent;
            navigator.clipboard.writeText(text).then(() => {
                this.textContent = 'Copied!';
                setTimeout(() => { this.textContent = 'Copy to clipboard'; }, 2000);
            });
        });

        // Litmap controls
        const resetBtn = document.getElementById('litmapReset');
        if (resetBtn) resetBtn.addEventListener('click', function () { if (window.litmapReset) window.litmapReset(); });
        const fullscreenBtn = document.getElementById('litmapFullscreen');
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', function () { if (window.litmapToggleFullscreen) window.litmapToggleFullscreen(); });

        // Share
        document.getElementById('shareBtn').addEventListener('click', function () {
            const url = window.location.href;
            if (navigator.share) {
                navigator.share({ title: currentResource.title, url: url });
            } else {
                navigator.clipboard.writeText(url).then(() => {
                    this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Link copied';
                    setTimeout(() => {
                        this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share';
                    }, 2000);
                });
            }
        });
    }

    // ---- Error ----
    function showError(msg) {
        document.querySelector('.detail-section').innerHTML =
            '<div class="container" style="padding:64px 24px;text-align:center;">' +
            '<p style="color:var(--color-text-muted);margin-bottom:16px;">' + escapeHtml(msg) + '</p>' +
            '<a href="index.html" class="action-btn action-primary" style="display:inline-flex;">&larr; Back to Library</a>' +
            '</div>';
    }

    // ---- Utilities ----
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();
