/**
 * litmap.js - Interactive force-directed connection graph
 * Inspired by LitMaps / Connected Papers
 * Development Discourses | ImpactMojo
 *
 * Pure SVG + vanilla JS - no external dependencies.
 */

(function () {
    'use strict';

    const TOPIC_COLORS = {
        'Climate & Environment': '#059669',
        'Data & Technology': '#7c3aed',
        'Development Economics': '#2563eb',
        'Gender & Social Inclusion': '#db2777',
        'Livelihoods': '#d97706',
        'MEAL & Evaluation': '#0891b2',
        'Public Health': '#dc2626',
        'Public Policy & Governance': '#4f46e5',
        'Research Methods': '#6366f1',
        'Education': '#0d9488',
        'WASH': '#0284c7',
        'Migration & Urbanization': '#9333ea',
        'Conflict & Humanitarian': '#b91c1c',
        'Agriculture & Food Systems': '#65a30d',
        'Social Protection': '#c026d3',
        'Financial Inclusion': '#ea580c',
        'Disability & Inclusion': '#475569',
    };

    let simulation = null;
    let svgEl = null;
    let transform = { x: 0, y: 0, k: 1 };
    let isDragging = false;
    let dragNode = null;
    let dragOffset = { x: 0, y: 0 };
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let tooltip = null;
    let lastCurrentResource = null;
    let lastAllResources = null;

    /**
     * Build and render the litmap for a given resource.
     * Called from resource.js after data is loaded.
     */
    window.renderLitmap = function (currentResource, allResources) {
        svgEl = document.getElementById('litmapSvg');
        if (!svgEl) return;

        lastCurrentResource = currentResource;
        lastAllResources = allResources;

        const container = document.getElementById('litmapContainer');
        const section = document.getElementById('litmapSection');
        const isFullscreen = section && section.classList.contains('litmap-fullscreen');
        const W = isFullscreen ? (window.innerWidth - 48) : (container.clientWidth || 700);
        const H = isFullscreen ? (window.innerHeight - 140) : 480;
        svgEl.setAttribute('width', W);
        svgEl.setAttribute('height', H);
        svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);

        // Score connections
        const connections = allResources
            .filter(other => other.id !== currentResource.id)
            .map(other => ({
                resource: other,
                score: scoreConnection(currentResource, other),
            }))
            .filter(c => c.score > 2)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

        if (connections.length === 0) {
            svgEl.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#8a8a8a" font-size="14" font-family="Inter, sans-serif">No strong connections found in the library.</text>`;
            return;
        }

        // Build nodes and links
        const nodes = [
            {
                id: currentResource.id,
                title: currentResource.title,
                authors: currentResource.authors,
                year: currentResource.year,
                topic: currentResource.topic,
                isCenter: true,
                x: W / 2,
                y: H / 2,
                vx: 0,
                vy: 0,
                radius: 14,
            },
        ];

        const links = [];

        connections.forEach((c, i) => {
            const angle = (2 * Math.PI * i) / connections.length;
            const dist = 120 + Math.random() * 80;
            nodes.push({
                id: c.resource.id,
                title: c.resource.title,
                authors: c.resource.authors,
                year: c.resource.year,
                topic: c.resource.topic,
                isCenter: false,
                x: W / 2 + dist * Math.cos(angle),
                y: H / 2 + dist * Math.sin(angle),
                vx: 0,
                vy: 0,
                radius: 5 + Math.min(c.score, 12),
            });
            links.push({
                source: 0,
                target: nodes.length - 1,
                strength: c.score,
            });
        });

        // Add inter-node links (secondary connections)
        for (let i = 1; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const ri = connections[i - 1].resource;
                const rj = connections[j - 1].resource;
                const s = scoreConnection(ri, rj);
                if (s > 3) {
                    links.push({ source: i, target: j, strength: s * 0.5 });
                }
            }
        }

        // Build legend
        buildLegend(nodes);

        // Create tooltip
        createTooltip(container);

        // Run force simulation
        runSimulation(nodes, links, W, H);

        // Render
        renderSVG(nodes, links, W, H, currentResource.id);
    };

    function scoreConnection(a, b) {
        let score = 0;
        if (a.topic === b.topic) score += 3;
        const tagsA = new Set(a.tags || []);
        (b.tags || []).forEach(t => { if (tagsA.has(t)) score += 1.5; });
        const authA = (a.authors || '').toLowerCase().split(/[,&]+/).map(s => s.trim().split(/\s+/).pop()).filter(Boolean);
        const authB = (b.authors || '').toLowerCase().split(/[,&]+/).map(s => s.trim().split(/\s+/).pop()).filter(Boolean);
        authA.forEach(x => { if (authB.includes(x)) score += 5; });
        return score;
    }

    function runSimulation(nodes, links, W, H) {
        // Simple force simulation (no d3 dependency)
        const iterations = 120;
        const repulsion = 2000;
        const attraction = 0.005;
        const centerForce = 0.01;
        const damping = 0.9;

        for (let iter = 0; iter < iterations; iter++) {
            const alpha = 1 - iter / iterations;

            // Repulsion between all nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    let dx = nodes[j].x - nodes[i].x;
                    let dy = nodes[j].y - nodes[i].y;
                    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    let force = (repulsion * alpha) / (dist * dist);
                    let fx = (dx / dist) * force;
                    let fy = (dy / dist) * force;
                    nodes[i].vx -= fx;
                    nodes[i].vy -= fy;
                    nodes[j].vx += fx;
                    nodes[j].vy += fy;
                }
            }

            // Attraction along links
            links.forEach(link => {
                let a = nodes[link.source];
                let b = nodes[link.target];
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                let targetDist = 100 + (20 - Math.min(link.strength, 18)) * 8;
                let force = (dist - targetDist) * attraction * alpha * link.strength;
                let fx = (dx / dist) * force;
                let fy = (dy / dist) * force;
                if (!a.isCenter || iter < 20) {
                    a.vx += fx;
                    a.vy += fy;
                }
                b.vx -= fx;
                b.vy -= fy;
            });

            // Center gravity
            nodes.forEach(n => {
                n.vx += (W / 2 - n.x) * centerForce * alpha;
                n.vy += (H / 2 - n.y) * centerForce * alpha;
            });

            // Apply velocity
            nodes.forEach(n => {
                if (n.isCenter && iter >= 20) return;
                n.vx *= damping;
                n.vy *= damping;
                n.x += n.vx;
                n.y += n.vy;
                // Keep in bounds
                n.x = Math.max(n.radius + 20, Math.min(W - n.radius - 20, n.x));
                n.y = Math.max(n.radius + 20, Math.min(H - n.radius - 20, n.y));
            });
        }

        // Pin center node
        nodes[0].x = W / 2;
        nodes[0].y = H / 2;
    }

    function renderSVG(nodes, links, W, H, currentId) {
        const ns = 'http://www.w3.org/2000/svg';
        svgEl.innerHTML = '';

        // Defs for glow/shadow
        const defs = document.createElementNS(ns, 'defs');
        const filter = document.createElementNS(ns, 'filter');
        filter.setAttribute('id', 'glow');
        filter.innerHTML = '<feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>';
        defs.appendChild(filter);
        svgEl.appendChild(defs);

        // Container group for zoom/pan
        const g = document.createElementNS(ns, 'g');
        g.setAttribute('id', 'litmapGroup');
        updateTransform(g);
        svgEl.appendChild(g);

        // Draw links
        links.forEach(link => {
            const a = nodes[link.source];
            const b = nodes[link.target];
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', a.x);
            line.setAttribute('y1', a.y);
            line.setAttribute('x2', b.x);
            line.setAttribute('y2', b.y);
            const opacity = 0.08 + Math.min(link.strength, 15) * 0.04;
            const width = 0.5 + Math.min(link.strength, 12) * 0.25;
            line.setAttribute('stroke', '#2563eb');
            line.setAttribute('stroke-opacity', opacity);
            line.setAttribute('stroke-width', width);
            line.dataset.origOpacity = opacity;
            line.classList.add('litmap-link');
            g.appendChild(line);
        });

        // Draw nodes
        nodes.forEach((node, idx) => {
            const color = TOPIC_COLORS[node.topic] || '#6b7280';

            const group = document.createElementNS(ns, 'g');
            group.classList.add('litmap-node');
            group.dataset.idx = idx;
            group.dataset.id = node.id;
            group.style.cursor = 'pointer';

            // Year ring (background circle showing decade)
            if (!node.isCenter && node.year) {
                const yearRing = document.createElementNS(ns, 'circle');
                yearRing.setAttribute('cx', node.x);
                yearRing.setAttribute('cy', node.y);
                yearRing.setAttribute('r', node.radius + 3);
                yearRing.setAttribute('fill', 'none');
                yearRing.setAttribute('stroke', color);
                yearRing.setAttribute('stroke-opacity', '0.2');
                yearRing.setAttribute('stroke-width', '2');
                group.appendChild(yearRing);
            }

            // Main circle
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', node.radius);
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', node.isCenter ? 3 : 1.5);
            if (node.isCenter) circle.setAttribute('filter', 'url(#glow)');
            group.appendChild(circle);

            // Label
            const label = document.createElementNS(ns, 'text');
            label.setAttribute('x', node.x);
            label.setAttribute('y', node.y + node.radius + 14);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', node.isCenter ? '12' : '10');
            label.setAttribute('font-weight', node.isCenter ? '600' : '400');
            label.setAttribute('font-family', 'Inter, sans-serif');
            label.setAttribute('fill', '#374151');
            label.setAttribute('pointer-events', 'none');

            const titleText = truncateText(node.title, node.isCenter ? 35 : 25);
            label.textContent = titleText;
            group.appendChild(label);

            // Year below label (for non-center)
            if (node.year && !node.isCenter) {
                const yearLabel = document.createElementNS(ns, 'text');
                yearLabel.setAttribute('x', node.x);
                yearLabel.setAttribute('y', node.y + node.radius + 26);
                yearLabel.setAttribute('text-anchor', 'middle');
                yearLabel.setAttribute('font-size', '9');
                yearLabel.setAttribute('font-family', 'Inter, sans-serif');
                yearLabel.setAttribute('fill', '#9ca3af');
                yearLabel.setAttribute('pointer-events', 'none');
                yearLabel.textContent = node.year;
                group.appendChild(yearLabel);
            }

            g.appendChild(group);
        });

        // Event handling
        bindNodeEvents(nodes, currentId);
        bindPanZoom(svgEl, g, W, H);
    }

    function bindNodeEvents(nodes, currentId) {
        const nodeEls = svgEl.querySelectorAll('.litmap-node');

        nodeEls.forEach(el => {
            const idx = parseInt(el.dataset.idx);
            const node = nodes[idx];

            // Click to navigate
            el.addEventListener('click', function (e) {
                if (isDragging) return;
                if (node.id === currentId) return; // already here
                window.location.href = 'resource.html?id=' + encodeURIComponent(node.id);
            });

            // Hover tooltip
            el.addEventListener('mouseenter', function (e) {
                showTooltip(e, node);
                // Highlight connected links
                svgEl.querySelectorAll('.litmap-link').forEach(link => {
                    link.setAttribute('stroke-opacity', '0.03');
                });
                // Find and highlight connected links
                const group = document.getElementById('litmapGroup');
                const linkEls = group.querySelectorAll('.litmap-link');
                linkEls.forEach((linkEl, li) => {
                    // Check adjacency via position matching (simple)
                    const x1 = parseFloat(linkEl.getAttribute('x1'));
                    const y1 = parseFloat(linkEl.getAttribute('y1'));
                    const x2 = parseFloat(linkEl.getAttribute('x2'));
                    const y2 = parseFloat(linkEl.getAttribute('y2'));
                    const nx = node.x;
                    const ny = node.y;
                    if ((Math.abs(x1 - nx) < 1 && Math.abs(y1 - ny) < 1) ||
                        (Math.abs(x2 - nx) < 1 && Math.abs(y2 - ny) < 1)) {
                        linkEl.setAttribute('stroke-opacity', '0.6');
                        linkEl.setAttribute('stroke', TOPIC_COLORS[node.topic] || '#2563eb');
                    }
                });

                // Dim other nodes
                nodeEls.forEach(other => {
                    if (other !== el) other.style.opacity = '0.3';
                });
                el.style.opacity = '1';
            });

            el.addEventListener('mouseleave', function () {
                hideTooltip();
                svgEl.querySelectorAll('.litmap-link').forEach(link => {
                    link.setAttribute('stroke', '#2563eb');
                    link.setAttribute('stroke-opacity', link.dataset.origOpacity || '0.15');
                });
                nodeEls.forEach(other => { other.style.opacity = '1'; });
            });

            // Drag
            el.addEventListener('mousedown', function (e) {
                if (e.button !== 0) return;
                e.stopPropagation();
                dragNode = { el, idx, node };
                const rect = svgEl.getBoundingClientRect();
                dragOffset.x = (e.clientX - rect.left) / transform.k - transform.x / transform.k - node.x;
                dragOffset.y = (e.clientY - rect.top) / transform.k - transform.y / transform.k - node.y;
                isDragging = false;
            });
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragNode) return;
            isDragging = true;
            const rect = svgEl.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / transform.k - transform.x / transform.k - dragOffset.x;
            const ny = (e.clientY - rect.top) / transform.k - transform.y / transform.k - dragOffset.y;

            // Save old position before updating
            const oldX = dragNode.node.x;
            const oldY = dragNode.node.y;
            dragNode.node.x = nx;
            dragNode.node.y = ny;

            // Update circle positions
            const circles = dragNode.el.querySelectorAll('circle');
            circles.forEach(c => { c.setAttribute('cx', nx); c.setAttribute('cy', ny); });
            const texts = dragNode.el.querySelectorAll('text');
            if (texts[0]) {
                texts[0].setAttribute('x', nx);
                texts[0].setAttribute('y', ny + dragNode.node.radius + 14);
            }
            if (texts[1]) {
                texts[1].setAttribute('x', nx);
                texts[1].setAttribute('y', ny + dragNode.node.radius + 26);
            }

            // Update connected links
            const group = document.getElementById('litmapGroup');
            group.querySelectorAll('.litmap-link').forEach(linkEl => {
                const x1 = parseFloat(linkEl.getAttribute('x1'));
                const y1 = parseFloat(linkEl.getAttribute('y1'));
                const x2 = parseFloat(linkEl.getAttribute('x2'));
                const y2 = parseFloat(linkEl.getAttribute('y2'));
                if (Math.abs(x1 - oldX) < 2 && Math.abs(y1 - oldY) < 2) {
                    linkEl.setAttribute('x1', nx);
                    linkEl.setAttribute('y1', ny);
                } else if (Math.abs(x2 - oldX) < 2 && Math.abs(y2 - oldY) < 2) {
                    linkEl.setAttribute('x2', nx);
                    linkEl.setAttribute('y2', ny);
                }
            });
        });

        document.addEventListener('mouseup', function () {
            if (dragNode) {
                setTimeout(() => { isDragging = false; }, 50);
                dragNode = null;
            }
        });
    }

    function bindPanZoom(svg, g, W, H) {
        // Zoom with wheel
        svg.addEventListener('wheel', function (e) {
            e.preventDefault();
            const rect = svg.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newK = Math.max(0.3, Math.min(4, transform.k * delta));

            // Zoom toward mouse position
            transform.x = mx - (mx - transform.x) * (newK / transform.k);
            transform.y = my - (my - transform.y) * (newK / transform.k);
            transform.k = newK;

            updateTransform(g);
        }, { passive: false });

        // Pan with mouse drag on background
        svg.addEventListener('mousedown', function (e) {
            if (dragNode) return;
            isPanning = true;
            panStart.x = e.clientX - transform.x;
            panStart.y = e.clientY - transform.y;
            svg.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function (e) {
            if (!isPanning) return;
            transform.x = e.clientX - panStart.x;
            transform.y = e.clientY - panStart.y;
            updateTransform(g);
        });

        document.addEventListener('mouseup', function () {
            if (isPanning) {
                isPanning = false;
                svgEl.style.cursor = 'grab';
            }
        });

        svg.style.cursor = 'grab';
    }

    function updateTransform(g) {
        g.setAttribute('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
    }

    function buildLegend(nodes) {
        const legendEl = document.getElementById('litmapLegend');
        if (!legendEl) return;
        const topics = [...new Set(nodes.map(n => n.topic))];
        legendEl.innerHTML = topics.map(t =>
            `<span class="litmap-legend-item"><span class="litmap-legend-dot" style="background:${TOPIC_COLORS[t] || '#6b7280'}"></span>${t}</span>`
        ).join('');
    }

    function createTooltip(container) {
        // Remove any existing tooltip from a previous render
        const existing = container.querySelector('.litmap-tooltip');
        if (existing) existing.remove();

        tooltip = document.createElement('div');
        tooltip.className = 'litmap-tooltip';
        tooltip.style.display = 'none';
        container.appendChild(tooltip);
    }

    function showTooltip(e, node) {
        if (!tooltip) return;
        const color = TOPIC_COLORS[node.topic] || '#6b7280';
        tooltip.innerHTML = `
            <div class="litmap-tooltip-title">${escapeHtml(node.title)}</div>
            <div class="litmap-tooltip-meta">${escapeHtml(node.authors || '')}${node.year ? ' (' + node.year + ')' : ''}</div>
            <div class="litmap-tooltip-topic" style="color:${color}">${escapeHtml(node.topic)}</div>
            ${!node.isCenter ? '<div class="litmap-tooltip-action">Click to view</div>' : '<div class="litmap-tooltip-action">Current resource</div>'}
        `;
        tooltip.style.display = 'block';

        const rect = tooltip.parentElement.getBoundingClientRect();
        const tx = e.clientX - rect.left + 12;
        const ty = e.clientY - rect.top - 10;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
    }

    function hideTooltip() {
        if (tooltip) tooltip.style.display = 'none';
    }

    function truncateText(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // Reset/fullscreen controls
    window.litmapReset = function () {
        transform = { x: 0, y: 0, k: 1 };
        const g = document.getElementById('litmapGroup');
        if (g) updateTransform(g);
    };

    window.litmapToggleFullscreen = function () {
        const section = document.getElementById('litmapSection');
        if (!section) return;
        section.classList.toggle('litmap-fullscreen');
        // Re-render the litmap at the new dimensions
        if (lastCurrentResource && lastAllResources) {
            transform = { x: 0, y: 0, k: 1 };
            window.renderLitmap(lastCurrentResource, lastAllResources);
        }
    };
})();
