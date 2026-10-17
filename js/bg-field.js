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
