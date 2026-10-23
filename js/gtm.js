// Google Tag Manager, loaded once the page is settled: on the first interaction, or a few seconds
// after load, so the tag's own work does not compete with first paint and input.
(() => {
    const ID = 'GTM-PJDK65KS';
    let started = false;

    function start() {
        if (started) return;
        started = true;
        ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((e) => removeEventListener(e, start));
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtm.js?id=' + ID;
        document.head.appendChild(s);
    }

    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((e) => addEventListener(e, start, { passive: true, once: true }));
    addEventListener('load', () => setTimeout(start, 3500));
})();
