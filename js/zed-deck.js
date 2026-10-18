// Deck of example threads, with a list of their questions beside it: choosing a question dips the
// front window down, slides it behind the others, and brings the chosen one forward. Without this script the windows just stack.
(() => {
    const deck = document.getElementById('zed-deck');
    if (!deck) return;
    const cards = [...deck.querySelectorAll('.zed')];
    const list = document.querySelector('.zed-list');
    if (cards.length < 2 || !list) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const items = [...list.querySelectorAll('button')];
    const DIP_MS = 260;
    const AUTO_MS = 20000;

    let order = cards.map((_, i) => i); // order[0] is the front card
    let busy = false;
    let timer = 0;
    let paused = false;

    function render() {
        order.forEach((cardIndex, pos) => {
            const card = cards[cardIndex];
            card.dataset.pos = pos;
            card.toggleAttribute('inert', pos !== 0);
            card.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
        });
        items.forEach((item, i) => item.setAttribute('aria-pressed', String(i === order[0])));
    }

    function rotate(times) {
        for (let i = 0; i < times; i++) order.push(order.shift());
    }

    function advance(times = 1) {
        if (busy) return;
        busy = true;
        const front = cards[order[0]];
        const finish = () => {
            front.classList.remove('is-leaving');
            rotate(times);
            render();
            setTimeout(() => { busy = false; }, reduceMotion.matches ? 0 : 420);
        };
        if (reduceMotion.matches) return finish();
        front.classList.add('is-leaving'); // dip down first
        setTimeout(finish, DIP_MS);        // then it goes behind and the next one comes up
    }

    function show(index) {
        const times = order.indexOf(index);
        if (times > 0) advance(times);
    }

    function schedule() {
        clearTimeout(timer);
        if (reduceMotion.matches || paused) return;
        timer = setTimeout(() => { advance(); schedule(); }, AUTO_MS);
    }

    items.forEach((item, i) => item.addEventListener('click', () => { show(i); schedule(); }));
    for (const ev of ['pointerenter', 'focusin']) deck.addEventListener(ev, () => { paused = true; clearTimeout(timer); });
    for (const ev of ['pointerleave', 'focusout']) deck.addEventListener(ev, () => { paused = false; schedule(); });
    for (const ev of ['pointerenter', 'focusin']) list.addEventListener(ev, () => { paused = true; clearTimeout(timer); });
    for (const ev of ['pointerleave', 'focusout']) list.addEventListener(ev, () => { paused = false; schedule(); });

    deck.classList.add('is-deck');
    deck.closest('.zed-layout').classList.add('has-list');
    list.hidden = false;
    render();
    schedule();
})();
