// Vacuum-display touches: a rare flicker on a few small parts and a scroll meter.
// Everything is decoration, and it is skipped with reduced motion.
(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    // ---- Flicker ---------------------------------------------------------------------------
    $$('.chapter-index .roman, .chapter-kicker .tag, .hero-project-index').forEach((el) => {
        el.classList.add('vfd-flicker');
        el.style.setProperty('--flicker-len', `${(7 + Math.random() * 7).toFixed(1)}s`);
        el.style.setProperty('--flicker-delay', `${(-Math.random() * 12).toFixed(1)}s`);
    });

    // ---- Scroll meter ----------------------------------------------------------------------
    // The header's lower rule, cut into one segment per section on the page. A segment lights when its
    // section has been reached, and the last one reached glows brighter.
    const header = document.querySelector('.site-header');
    const sections = $$('main > section, main > article > section');
    if (!header || !sections.length) return;
    const meter = document.createElement('div');
    meter.className = 'vfd-meter';
    meter.setAttribute('aria-hidden', 'true');
    meter.innerHTML = sections.map(() => '<i class="vfd-step"></i>').join('');
    header.append(meter);
    const steps = $$('.vfd-step', meter);

    let tops = [];
    let lead = 0;
    let level = -1;
    function track() {
        const bottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
        const line = scrollY + lead;
        const next = bottom ? sections.length : Math.max(1, tops.filter((top) => top <= line).length);
        if (next === level) return;
        level = next;
        steps.forEach((step, i) => {
            step.classList.toggle('on', i < level);
            step.classList.toggle('hot', i === level - 1);
        });
    }
    window.addEventListener('scroll', track, { passive: true });

    // Layout is read from a ResizeObserver callback, where it is already clean, so measuring does not
    // force a reflow. Whatever sticks under the header (the crumb, anchor jumps) follows its height.
    function measure() {
        const height = header.offsetHeight;
        document.documentElement.style.setProperty('--header-h', `${height}px`);
        tops = sections.map((section) => section.getBoundingClientRect().top + scrollY);
        lead = height + 120;
        level = -1;
        track();
    }
    if ('ResizeObserver' in window) {
        const layout = new ResizeObserver(measure);
        layout.observe(document.documentElement);
        layout.observe(header);
    } else {
        measure();
        window.addEventListener('resize', measure);
    }
})();
