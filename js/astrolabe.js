// The astrolabe: a Voronoi diagram and its Delaunay triangulation of drifting points, a ring of
// phosphor signal ticks around it, and a ring of math and C++ glyphs that stay upright as they
// orbit. The pointer disturbs all three: points are pushed away, the signal swells toward it and
// the nearest glyphs light up. Without JS (or with reduced motion) the page keeps the static
// first frame that is written into the SVG.
(() => {
    const BOX = 400;             // cells are cut from a box this big, so hull cells stay closed
    const GLYPH_R = 122;         // radius of the glyph ring: halfway between the inner circle (102) and the outer one (142)
    const GLYPH_TURN = 0.0045;   // radians per second
    const PHOSPHOR = '#f6c64a';
    const DIM_GLYPH = 'rgba(236,232,223,0.35)';

    // Resting positions around the hub: one in the middle, a ring of six, an outer ring of ten.
    const BASE = [[0, 0]];
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.35;
        BASE.push([Math.cos(a) * 40, Math.sin(a) * 40]);
    }
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.1;
        const r = 78 + (i % 2) * 13;
        BASE.push([Math.cos(a) * r, Math.sin(a) * r]);
    }

    function sites(t) {
        return BASE.map(([x, y], i) => {
            const a = 6 + (i % 3) * 2;
            return [
                x + Math.sin(t * (0.21 + 0.03 * (i % 5)) + i * 1.7) * a,
                y + Math.cos(t * (0.17 + 0.02 * (i % 4)) + i * 2.3) * a,
            ];
        });
    }

    // Cut the big box down to the cell of site i. Every vertex carries the label of the site whose
    // bisector made the edge that starts there (-1: the box), which gives the Delaunay neighbours.
    function cell(pts, i) {
        const [px, py] = pts[i];
        let poly = [[-BOX, -BOX, -1], [BOX, -BOX, -1], [BOX, BOX, -1], [-BOX, BOX, -1]];
        for (let j = 0; j < pts.length; j++) {
            if (j === i) continue;
            const [qx, qy] = pts[j];
            const nx = qx - px, ny = qy - py;
            const c = (nx * (px + qx) + ny * (py + qy)) / 2;
            const side = (p) => nx * p[0] + ny * p[1] - c;  // <= 0 is on i's side
            const out = [];
            for (let k = 0; k < poly.length; k++) {
                const a = poly[k], b = poly[(k + 1) % poly.length];
                const sa = side(a), sb = side(b);
                const ain = sa <= 0, bin = sb <= 0;
                if (ain) out.push(a);
                if (ain !== bin) {
                    const u = sa / (sa - sb);
                    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, ain ? j : a[2]]);
                }
            }
            poly = out;
            if (poly.length < 3) break;
        }
        return poly;
    }

    const f = (n) => (Math.round(n * 10) / 10).toString();

    // The signal ring: radial ticks just outside the outer circle, long where a few slow waves add up.
    // Ticks past the lit threshold glow like phosphor; the rest stay as dim, unlit segments.
    // `swell` is a bump in the signal at one angle (where the pointer is), 0 when it is away.
    const TICKS = 120, R0 = 146, RMAX = 158, LIT = 0.6;
    function signal(t, swell, rot = 0) {
        let dim = '', lit = '';
        for (let i = 0; i < TICKS; i++) {
            const a = (i / TICKS) * Math.PI * 2;
            const p = a - rot;                                    // the pattern turns with the wheel
            const w = 0.5 * Math.sin(3 * p + t * 0.8) + 0.3 * Math.sin(7 * p - t * 1.3) + 0.2 * Math.sin(13 * p + t * 2.1);
            let level = (w + 1) / 2;
            if (swell) {
                let d = Math.abs(a - swell.angle);
                d = Math.min(d, Math.PI * 2 - d);
                level = Math.min(1, level + swell.amount * Math.exp(-(d * d) / 0.06));
            }
            const r2 = R0 + 1.5 + (RMAX - R0 - 1.5) * level;
            const c = Math.cos(a), n = Math.sin(a);
            const seg = `M${f(c * R0)} ${f(n * R0)}L${f(c * r2)} ${f(n * r2)}`;
            if (level > LIT) lit += seg; else dim += seg;
        }
        return { dim, lit };
    }

    function frame(t, swell, pts = sites(t), rot = 0) {
        let vor = '', del = '';
        for (let i = 0; i < pts.length; i++) {
            const poly = cell(pts, i);
            for (let k = 0; k < poly.length; k++) {
                const a = poly[k], b = poly[(k + 1) % poly.length], j = a[2];
                if (j <= i) continue;                       // box edges (-1) and the twin of a drawn edge
                vor += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
                del += `M${f(pts[i][0])} ${f(pts[i][1])}L${f(pts[j][0])} ${f(pts[j][1])}`;
            }
        }
        return { pts, vor, del, sig: signal(t, swell, rot) };
    }

    if (typeof module !== 'undefined') module.exports = { frame, sites, GLYPH_R };
    if (typeof document === 'undefined') return;

    const svg = document.querySelector('.astrolabe');
    const vor = document.getElementById('astro-vor');
    const del = document.getElementById('astro-del');
    const dots = document.getElementById('astro-sites');
    const dim = document.getElementById('astro-sig');
    const lit = document.getElementById('astro-lit');
    const glyphs = [...document.querySelectorAll('#astro-glyphs > path')];
    if (!svg || !vor || !del || !dots || !dim || !lit) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const circles = [...dots.children];
    const centres = glyphs.map((g) => (g.dataset.c || '12 12').split(' ').map(Number));

    // The pointer, in the astrolabe's own units with the hub at (0, 0). `reach` eases toward 1 while
    // the pointer is near the astrolabe and back to 0 when it leaves, so nothing jumps.
    const pointer = { x: 0, y: 0, reach: 0, target: 0 };
    const place = (e) => {
        const box = svg.getBoundingClientRect();
        if (!box.width) return;
        const k = 320 / box.width;
        pointer.x = (e.clientX - box.left - box.width / 2) * k;
        pointer.y = (e.clientY - box.top - box.height / 2) * k;
        pointer.target = Math.hypot(pointer.x, pointer.y) < 260 ? 1 : 0;
    };
    window.addEventListener('pointermove', place, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.target = 0; });

    // Dragging the wheel (the glyph ring and the signal ring) spins it, and it keeps turning for a
    // while after you let go. `angle` is the extra turn on top of the slow orbit.
    const spin = { angle: 0, velocity: 0, dragging: false, from: 0, id: -1, moved: 0, stamp: 0 };
    const onWheel = () => { const d = Math.hypot(pointer.x, pointer.y); return d > 98 && d < 166; };
    const aim = () => Math.atan2(pointer.y, pointer.x);
    window.addEventListener('pointerdown', (e) => {
        place(e);
        if (e.button > 0 || !onWheel()) return;
        spin.dragging = true;
        spin.id = e.pointerId;
        spin.from = aim();
        spin.velocity = 0;
        svg.classList.add('is-dragging');
        e.preventDefault();
    });
    const release = (e) => {
        if (!spin.dragging || (e && e.pointerId !== spin.id)) return;
        spin.dragging = false;
        svg.classList.remove('is-dragging');
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('pointermove', (e) => {
        svg.classList.toggle('is-wheel', onWheel() && !spin.dragging);
        if (!spin.dragging || e.pointerId !== spin.id) return;
        const now = aim();
        let d = now - spin.from;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        spin.from = now;
        spin.angle += d;
        spin.moved += d;
        spin.velocity = d / Math.max(0.008, (e.timeStamp - (spin.stamp || e.timeStamp - 16)) / 1000);
        spin.stamp = e.timeStamp;
    }, { passive: true });

    // Each site keeps an offset that eases toward "pushed away from the pointer".
    const push = BASE.map(() => [0, 0]);
    let last = 0;

    function draw(ms) {
        if (!svg.getClientRects().length) { last = ms; requestAnimationFrame(draw); return; }   // hidden on narrow screens
        // About 30 fps is plenty for slow drift, and halves the SVG filter repaints.
        if (ms - last < 30) { requestAnimationFrame(draw); return; }
        const dt = Math.min(0.1, (ms - last) / 1000 || 0.016);
        last = ms;
        const t = ms / 1000;
        pointer.reach += (pointer.target - pointer.reach) * Math.min(1, dt * 4);
        if (!spin.dragging) {
            spin.angle += spin.velocity * dt;
            spin.velocity *= Math.exp(-dt * 1.5);
            if (Math.abs(spin.velocity) < 0.01) spin.velocity = 0;
        }
        const swell = pointer.reach > 0.02
            ? { angle: (Math.atan2(pointer.y, pointer.x) + Math.PI * 2) % (Math.PI * 2), amount: 0.7 * pointer.reach }
            : null;
        // Points: the drifting position plus the push away from the pointer.
        const base = sites(t);
        const moved = base.map(([x, y], i) => {
            const dx = x - pointer.x, dy = y - pointer.y;
            const d = Math.hypot(dx, dy) || 1;
            const force = pointer.reach * Math.max(0, 1 - d / 70) * 22;
            const tx = (dx / d) * force, ty = (dy / d) * force;
            push[i][0] += (tx - push[i][0]) * Math.min(1, dt * 6);
            push[i][1] += (ty - push[i][1]) * Math.min(1, dt * 6);
            return [x + push[i][0], y + push[i][1]];
        });
        const out = frame(t, swell, moved, spin.angle);
        vor.setAttribute('d', out.vor);
        del.setAttribute('d', out.del);
        dim.setAttribute('d', out.sig.dim);
        lit.setAttribute('d', out.sig.lit);
        lit.setAttribute('opacity', f(0.8 + 0.2 * Math.sin(ms / 140) * Math.sin(ms / 530)));
        moved.forEach(([x, y], i) => {
            circles[i].setAttribute('cx', f(x));
            circles[i].setAttribute('cy', f(y));
        });
        // Glyphs: orbit slowly but stay upright; the ones near the pointer light up.
        glyphs.forEach((g, i) => {
            const a = (i / glyphs.length) * Math.PI * 2 + t * GLYPH_TURN + spin.angle;
            const x = Math.sin(a) * GLYPH_R, y = -Math.cos(a) * GLYPH_R;
            const [cx, cy] = centres[i];
            g.setAttribute('transform', `translate(${f(160 + x)} ${f(160 + y)}) scale(0.75) translate(${-cx} ${-cy})`);
            const near = pointer.reach * Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 60);
            g.setAttribute('stroke', near > 0.08 ? PHOSPHOR : DIM_GLYPH);
            g.setAttribute('stroke-opacity', near > 0.08 ? f(0.45 + 0.55 * near) : '1');
        });
        requestAnimationFrame(draw);
    }

    // Wait until the page has loaded, so the first animation frames do not compete with it.
    window.addEventListener('load', () => {
        if ('requestIdleCallback' in window) requestIdleCallback(() => requestAnimationFrame(draw), { timeout: 3000 });
        else setTimeout(() => requestAnimationFrame(draw), 1000);
    });
})();
