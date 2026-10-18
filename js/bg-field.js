// Animated background: the astrolabe's rings drift outward from the hub and the
// diagonal lattice rotates about the hub, all in page space so it scrolls with the content.
// The static gradients in css/style.css remain as the fallback.
(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    const RING_GAP = 104;      // px between bone rings
    const RING_SPEED = 5;      // px/s outward drift
    const LATTICE_GAP = 148;   // px between diagonal lines
    const LATTICE_TURN = 0.5;  // degrees/s, rotation of the lattice about the hub
    const HUB_Y = -90;         // page-space y of the hub

    const BONE = '236, 232, 223';
    const BLUE = '110, 168, 214';
    const AMBER = '217, 167, 92';

    // The twelve glyphs, in order. Drawn on two slow rings around the hub.
    const GLYPHS = [
        'M2 12Q12 3 22 12Q12 21 2 12Z M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 8v8',
        'M12 12m0 0a2 2 0 1 1 3 1.7a4 4 0 1 1-6-3.4a6 6 0 1 1 9 5.2 M18 18l3 3',
        'M12 2v20M12 7l-6 6M12 12l6-5M12 17l-5 4',
        'M4 13a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M7 6a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M11 4a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M15 6a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M4 13h16',
        'M4 10a8 8 0 0 0 16 0 M6 22l6-9 6 9z M10.8 5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
        'M6 3v9q0 5 6 5t6-5V3M12 17v5M8 20h8',
        'M12 2l8 10-8 10-8-10z M12 7l4 5-4 5-4-5z M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
        'M17 4H8v8h9v8H7 M4 4a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M18 20a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
        'M3 12a9 9 0 0 1 18 0 M7 12a5 5 0 0 0 10 0 M10.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0 M12 17v5',
        'M4 4q4 8 8 8t8-8M12 12v9M8 17h8',
        'M10 4a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M7 9v13M12 9v9M17 9v5',
        'M12 3v18M12 8L8 5M12 8l4-3M12 14l-5-3M12 14l5-3M12 19l-3-2M12 19l3-2'
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
        dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    function frame(now) {
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

        for (const ring of GLYPH_RINGS) glyphRing(hubX, cy, ring, t);

        // The instrument's vertical axis through the hub.
        ctx.beginPath();
        ctx.moveTo(Math.round(hubX) + 0.5, 0);
        ctx.lineTo(Math.round(hubX) + 0.5, height);
        ctx.strokeStyle = `rgba(${BONE}, 0.03)`;
        ctx.stroke();

        // Diagonal lattice: two perpendicular families of lines, LATTICE_GAP apart, turning rigidly
        // about the hub. Starts at 45 degrees, like the static fallback.
        const turn = Math.PI / 4 + ((t * LATTICE_TURN) * Math.PI) / 180;
        const kMax = Math.ceil(reach / LATTICE_GAP);
        ctx.strokeStyle = `rgba(${BONE}, 0.012)`;
        ctx.beginPath();
        for (const angle of [turn, turn + Math.PI / 2]) {
            const dx = Math.cos(angle), dy = Math.sin(angle); // line direction
            const nx = -dy, ny = dx;                          // line normal
            for (let k = -kMax; k <= kMax; k++) {
                const d = k * LATTICE_GAP;
                const px = hubX + nx * d, py = cy + ny * d;
                ctx.moveTo(px - dx * reach, py - dy * reach);
                ctx.lineTo(px + dx * reach, py + dy * reach);
            }
        }
        ctx.stroke();

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

    resize();
    start();
})();
