// Animated background: the astrolabe's rings drift outward from the hub, in page space so
// they scroll with the content.
// The static gradients in css/style.css remain as the fallback.
(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    const RING_GAP = 104;      // px between bone rings
    const RING_SPEED = 5;      // px/s outward drift
    const HUB_Y = -90;         // page-space y of the hub
    const RINGS_FADE_FROM = 380;   // page-space y where the rings start to fade ...
    const RINGS_FADE_TO = 760;     // ... and where they are gone

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

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const hub = getComputedStyle(root).getPropertyValue('--hub-x').trim();
        hubX = hub.endsWith('%') ? (parseFloat(hub) / 100) * width : parseFloat(hub) || width * 0.82;
    }

    function ring(cx, cy, r, color, alpha) {
        if (r <= 0) return;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
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

        // Farthest visible distance from the hub, to know how many rings to draw.
        const reach = Math.hypot(Math.max(hubX, width - hubX), Math.max(cy, height - cy));
        // The offset cycles through four gaps, so the 1-in-2 and 1-in-4 ring tones repeat seamlessly.
        const offset = (t * RING_SPEED) % (RING_GAP * 4);
        for (let i = 0, r = offset; r < reach; i++, r += RING_GAP) {
            if (i % 4 === 0) ring(hubX, cy, r, AMBER, 0.04);
            else if (i % 2 === 0) ring(hubX, cy, r, BLUE, 0.035);
            else ring(hubX, cy, r, BONE, 0.03);
        }

        // The instrument's vertical axis through the hub.
        ctx.beginPath();
        ctx.moveTo(Math.round(hubX) + 0.5, 0);
        ctx.lineTo(Math.round(hubX) + 0.5, height);
        ctx.strokeStyle = `rgba(${BONE}, 0.03)`;
        ctx.stroke();

        // The rings and the axis belong to the top of the page: lower down, where they would cross
        // the sections as faint diagonal streaks, they fade out.
        const fade = ctx.createLinearGradient(0, RINGS_FADE_FROM - scroll, 0, RINGS_FADE_TO - scroll);
        fade.addColorStop(0, 'rgba(0,0,0,1)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        for (const ring of GLYPH_RINGS) glyphRing(hubX, cy, ring, t);

        if (!revealed) {
            revealed = true;
            root.classList.add('bg-live'); // hide the static fallback
        }
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
    window.addEventListener('load', () => {
        if ('requestIdleCallback' in window) requestIdleCallback(begin, { timeout: 3000 });
        else setTimeout(begin, 1000);
    });
})();
