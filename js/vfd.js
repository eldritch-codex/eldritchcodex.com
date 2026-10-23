// Vacuum-display touches: a rare flicker on a few small parts and a scroll meter.
// Everything is decoration, and it is skipped with reduced motion.
(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    // ---- Flicker ---------------------------------------------------------------------------
    $$('.chapter-index .roman, .chapter-kicker .tag, .hero-project-index, .vfd-meter-pos').forEach((el) => {
        el.classList.add('vfd-flicker');
        el.style.setProperty('--flicker-len', `${(7 + Math.random() * 7).toFixed(1)}s`);
        el.style.setProperty('--flicker-delay', `${(-Math.random() * 12).toFixed(1)}s`);
    });

    // ---- Scroll meter ----------------------------------------------------------------------
    const meter = document.createElement('div');
    meter.className = 'vfd-meter';
    meter.innerHTML = '<div class="vfd-meter-inner"><span class="vfd-meter-label" aria-hidden="true">POS <span class="vfd-meter-pos">00</span>/10</span>' +
        '<span class="vfd-meter-scale" aria-hidden="true">' +
        Array.from({ length: 10 }, (_, i) => `<span class="vfd-step${i === 9 ? ' last' : ''}" data-n="${i}"><i></i><i></i></span>`).join('') +
        '</span></div>';
    document.body.append(meter);
    const toTop = document.querySelector('.to-top');   // the back-to-top button is the last part of the panel
    if (toTop) meter.firstChild.append(toTop);
    const steps = $$('.vfd-step', meter);
    const readout = $$('.vfd-meter-pos', meter)[0];
    function track() {
        const max = document.documentElement.scrollHeight - innerHeight;
        const level = max > 0 ? Math.round((scrollY / max) * 10) : 0;
        steps.forEach((step, i) => {
            step.classList.toggle('on', i < level);
            step.classList.toggle('hot', i === level - 1);
        });
        readout.textContent = String(level).padStart(2, '0');
    }
    window.addEventListener('scroll', track, { passive: true });
    window.addEventListener('resize', track);
    track();
})();
