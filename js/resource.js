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
        renderMetadata();
        renderTags();
        renderCitation();
        renderRelated();
        // Render interactive LitMaps-style graph
        if (window.renderLitmap) {
            window.renderLitmap(currentResource, allResources);
        }
        bindEvents();
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

        // Verified
        if (r.verified) {
            document.getElementById('verifiedBadge').style.display = 'inline-block';
        }

        document.getElementById('detailTitle').textContent = r.title;
        document.getElementById('detailAuthors').textContent = r.authors || 'Unknown';
        document.getElementById('detailYear').textContent = r.year || '';
        document.getElementById('detailTopic').textContent = r.topic;
        document.getElementById('detailDescription').textContent = r.description || 'No description available.';

        // Source link
        document.getElementById('readSourceBtn').href = r.url;

        // Community notes link
        const noteUrl = 'https://github.com/Varnasr/development-discourses/issues/new?title=' +
            encodeURIComponent('Community Note: ' + r.title) +
            '&labels=community-note&body=' +
            encodeURIComponent('## Community Note\n\n**Resource:** ' + r.title + '\n**ID:** ' + r.id + '\n\n### Note\n\n(Write your note here — reading tips, practitioner context, critiques, related resources...)\n');
        document.getElementById('contributeNote').href = noteUrl;
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
                return { label: 'Unknown', color: '#8a8a8a' };
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
            '<p style="color:#8a8a8a;margin-bottom:16px;">' + escapeHtml(msg) + '</p>' +
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
