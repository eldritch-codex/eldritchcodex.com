# EldritchCodex

The site for [EldritchCodex](https://eldritchcodex.com): open-source projects exploring software engineering
and mathematics and learning by building, from rendering and simulation to the tools around them.

- **[Nodens](nodens/)**: a C++23 application framework built on modules.
- **[Nyar](nyar/)**: a Vulkan renderer, built as a learning exercise for Nodens.
- **[Armitage](armitage/)**: a source-grounded personal agent and research toolkit, with a small core that other tools plug into.

The sources behind the projects are listed in a [public Zotero library](https://www.zotero.org/groups/6489354/eldritchcodex).

It is a static site served by GitHub Pages: plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Layout

```
index.html            home: the three projects side by side
nodens/ nyar/ armitage/
                      one page per project
css/style.css         layout, typography, components
css/vfd.css           the display styling (honeycomb mesh, lit labels, tags, header meter)
js/main.js            code highlighting, shell renderer, tab switcher, the Nyar triangle, copy buttons
js/astrolabe.js       the hero astrolabe (Voronoi cells, signal ring, glyph ring), drawn in SVG
js/bg-field.js        the drifting rings in the page background (canvas)
js/vfd.js             flicker on small parts, and the scroll meter in the header
js/zed-deck.js        the Armitage example panels, stacked like a deck of cards
js/gtm.js             Google Tag Manager, loaded on first interaction
assets/               favicon, marks, avatars, social cards (SVG sources next to the PNGs)
```

## Look

The site mixes an old printed reference with the glow of a vacuum fluorescent display (VFD):

- **Display styling**: amber light on hairlines and labels, a fine honeycomb mesh over panels like the grid in front
  of a VFD's phosphor, slanted tags, a faint flicker, and a header rule that is cut into one segment per section
  and lights as you scroll. All of it is off with reduced motion.
- **[MAINFRAME 1.0 by VKTRKRFT](https://www.behance.net/gallery/207791057/MAINFRAME-10-Premium)** on
  [Behance](https://www.behance.net/vktrkrft): the vacuum-tube and phosphor glow, with warm light on rules and corner
  marks.
- **[Zed](https://zed.dev/)**: the agent-panel chrome recreated for the Armitage demo (`js/zed-deck.js`).
- **Brass astrolabes and star charts**: the rotating rings, degree ticks and radial grid in the background and the
  hero figure.
- **Lovecraftian archive and ledger printing**: numbered sections, margin notes, hairline rules, and a palette named
  after figures from the stories (*Nodens*, *Nyar*, *Armitage*).

### Typography

- [Fraunces](https://fonts.google.com/specimen/Fraunces): display headings
- [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans): body text
- [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono): code, labels and index marks

The fonts load from Google Fonts without blocking the first paint (the stylesheet is switched on by `js/main.js`).

## Local preview

Serve the folder over HTTP and open it:

```bash
python3 -m http.server
```

## Things to know when editing

- **Content Security Policy.** GitHub Pages cannot set headers, so each page carries its policy in a `<meta>` tag.
  Inline scripts need a SHA-256 hash in `script-src`. The only inline script is the theme bootstrap in `<head>`:
  if you change it, recompute its hash and update all four pages. Everything else is an external file.
  New third-party hosts (analytics, fonts, images) must be added to the policy too.
- **Cache busting.** GitHub Pages caches files for about ten minutes, and browsers more. The `?v=N` on every
  stylesheet and script in the four pages is bumped whenever a file changes; keep them in sync.
- **Analytics.** Google Tag Manager loads on the first pointer, key or scroll event, or about 3.5 seconds after load,
  so it never competes with the first paint.
- **Animations** (`js/astrolabe.js`, `js/bg-field.js`, `js/vfd.js`) wait until the page has loaded, run at about 30 fps
  and are skipped with `prefers-reduced-motion`.
- **Sitemap.** Update `lastmod` in `sitemap.xml` when a page changes.

## Checking performance

The site is checked with [Lighthouse](https://developer.chrome.com/docs/lighthouse/) (the engine behind PageSpeed
Insights). Serve the folder, then run it against each page in a mobile profile:

```bash
python3 -m http.server 8000 &
npx lighthouse http://localhost:8000/ --chrome-flags="--headless=new" --view
```

Local runs have no gzip or cache headers, so ignore "efficient cache lifetimes" and "text compression" there; GitHub
Pages sets both. Scores vary from run to run, especially total blocking time.
