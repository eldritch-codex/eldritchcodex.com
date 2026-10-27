// Animated background: the astrolabe's rings drift outward from the hub, in page space so
// they scroll with the content. It draws the same layers as the static gradients in css/style.css
// (rings, axis, lattice), which remain as the fallback; the canvas only adds the motion.
(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    const RING_GAP = 104;      // px between bone rings
    const RING_SPEED = 5;      // px/s outward drift
    const HUB_Y = -90;         // page-space y of the hub

    const BONE = '236, 232, 223';
    const BLUE = '110, 168, 214';
    const AMBER = '217, 167, 92';

    // The twelve glyphs, in order. Drawn on two slow rings around the hub.
    const GLYPHS = [
        'M18 4H6l7 8-7 8h12',
        'M9 5l-6 7 6 7M15 5l6 7-6 7',
        'M15 3.5c-2.5-1-4 .8-4 3.5v10c0 2.7-1.5 4.5-4 3.5',
        'M9 3c-3 0-3 2-3 4v2c0 2-1 3-3 3 2 0 3 1 3 3v2c0 2 0 4 3 4M15 3c3 0 3 2 3 4v2c0 2 1 3 3 3-2 0-3 1-3 3v2c0 2 0 4-3 4',
        'M12 10a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 10C9.5 8 9.5 4 14 4h4',
        'M19 20L9.5 9C7.5 6.5 8.5 4 10.5 4s3.5 2.5 1.5 4.5L8.5 13C6 16 7.5 20 11 20c2.5 0 4.5-1.5 6-4.5',
        'M12 12c-2-3-3-4-5-4a4 4 0 0 0 0 8c2 0 3-1 5-4s3-4 5-4a4 4 0 0 1 0 8c-2 0-3-1-5-4z',
        'M3 12h17M14 6l6 6-6 6',
        'M11.5 10C14 10 16 12 16 15s-2 5-4.5 5S7 18 7 15s2-5 4.5-5zM16 15c0-6-3-9.5-7-10.5',
        'M9 4L7 20M17 4l-2 16M4 9h16M3 15h16',
        'M4 5h16l-8 15z',
        'M7 4v12M2 10h10M17 8v12M12 14h10'
    ].map((d) => new Path2D(d));
    const GLYPH_RINGS = [
        { radius: RING_GAP * 3, size: 22, speed: 0.35 },
        { radius: RING_GAP * 6, size: 24, speed: -0.25 },
    ];

    function glyphRing(cx, cy, ring, t) {
        const step = (ring.size + 84) / ring.radius;           // radians between glyphs
        const count = Math.round((Math.PI * 2) / step);
        const turn = (t * ring.speed * Math.PI) / 180;
        ctx.save();
        ctx.strokeStyle = `rgba(${BONE}, 0.075)`;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < count; i++) {
            const a = turn + (i / count) * Math.PI * 2;
            const x = cx + Math.sin(a) * ring.radius;
            const y = cy - Math.cos(a) * ring.radius;
            if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.translate(x, y);
            ctx.rotate(a);
            const s = ring.size / 24;
            ctx.scale(s, s);
            ctx.translate(-12, -12);
            ctx.lineWidth = 1.3 / s;
            ctx.stroke(GLYPHS[i % GLYPHS.length]);
        }
        ctx.restore();
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'bg-field';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    let width = 0, height = 0, dpr = 1, hubX = 0;
    let raf = 0, revealed = false;

    // Hide the static fallback once the canvas is drawing. This has to happen on the first frame
    // wherever the page is scrolled: a reload restores the scroll position, and below the fade the
    // frame only clears the canvas, so the fallback used to stay until the user scrolled back up.
    function reveal() {
        if (revealed) return;
        revealed = true;
        root.classList.add('bg-live');
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        // Match the screen's pixel density (capped at 2), or the thin rings are drawn small and stretched.
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const hub = getComputedStyle(root).getPropertyValue('--hub-x').trim();
        hubX = hub.endsWith('%') ? (parseFloat(hub) / 100) * width : parseFloat(hub) || width * 0.82;
    }

    // The same layers as the static gradients in css/style.css, in page space, with the rings moving.
    // Rings: bone every RING_GAP, blue every second, amber every fourth. Axis: one line through the hub.
    // Lattice: faint 45 and -45 degree lines, LATTICE_GAP apart, fixed to the page.
    const LATTICE_GAP = 148;
    const LATTICE_STEP = LATTICE_GAP * Math.SQRT2;   // distance between lattice lines along an axis

    function rings(cx, cy, period, offset, color, alpha, near, far) {
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        // Start at the first ring that can reach the screen; the others are far off and cost time.
        const first = Math.max(0, Math.floor((near - offset) / period));
        for (let r = offset + first * period; r < far; r += period) {
            if (r <= 0) continue;
            ctx.moveTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
        ctx.stroke();
    }

    function lattice(scroll) {
        const pageW = root.clientWidth || width;
        const pageH = Math.max(root.scrollHeight, height);
        ctx.strokeStyle = `rgba(${BONE}, 0.012)`;
        ctx.beginPath();
        // 45deg: lines run down and to the right, through y = x + (pageH - scroll) - k * step.
        for (let b = (pageH - scroll) % LATTICE_STEP - LATTICE_STEP; b < height; b += LATTICE_STEP) {
            if (b + width < 0) continue;
            ctx.moveTo(0, b);
            ctx.lineTo(width, b + width);
        }
        // -45deg: lines run up and to the right, through y = c - x with c = pageW + pageH - scroll - k * step.
        const c0 = (pageW + pageH - scroll) % LATTICE_STEP;
        for (let c = c0; c < width + height; c += LATTICE_STEP) {
            ctx.moveTo(0, c);
            ctx.lineTo(width, c - width);
        }
        ctx.stroke();
    }

    let lastDraw = 0;

    function frame(now) {
        // The drift is slow, so about 30 fps looks the same and halves the canvas work.
        if (now - lastDraw < 30) { raf = requestAnimationFrame(frame); return; }
        lastDraw = now;
        const t = now / 1000;
        const scroll = window.scrollY || 0;
        const cy = HUB_Y - scroll;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 1;

        lattice(scroll);

        // Nearest and farthest distance from the hub to the screen: only rings between them are drawn.
        const nearX = hubX < 0 ? -hubX : hubX > width ? hubX - width : 0;
        const nearY = cy < 0 ? -cy : cy > height ? cy - height : 0;
        const near = Math.hypot(nearX, nearY);
        const far = Math.hypot(Math.max(hubX, width - hubX), Math.max(Math.abs(cy), Math.abs(height - cy)));
        // The offset cycles through four gaps, so every ring tone repeats seamlessly.
        const offset = (t * RING_SPEED) % (RING_GAP * 4);
        rings(hubX, cy, RING_GAP, offset, BONE, 0.03, near, far);
        rings(hubX, cy, RING_GAP * 2, offset, BLUE, 0.035, near, far);
        rings(hubX, cy, RING_GAP * 4, offset, AMBER, 0.04, near, far);

        // The instrument's vertical axis through the hub.
        ctx.beginPath();
        ctx.moveTo(Math.round(hubX) + 0.5, 0);
        ctx.lineTo(Math.round(hubX) + 0.5, height);
        ctx.strokeStyle = `rgba(${BONE}, 0.03)`;
        ctx.stroke();

        for (const ring of GLYPH_RINGS) glyphRing(hubX, cy, ring, t);

        reveal();
        raf = requestAnimationFrame(frame);
    }

    function start() {
        if (!raf) raf = requestAnimationFrame(frame);
    }

    function stop() {
        cancelAnimationFrame(raf);
        raf = 0;
    }

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 120);
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // Start once the page has loaded and laid out, so measuring does not force a reflow.
    const begin = () => requestAnimationFrame(() => { resize(); start(); });
    // It is decoration over a static fallback, so it waits a couple of seconds after load.
    window.addEventListener('load', () => {
        setTimeout(() => {
            if ('requestIdleCallback' in window) requestIdleCallback(begin, { timeout: 3000 });
            else begin();
        }, 2500);
    });
})();
