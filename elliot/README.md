# Games Site

An Eleventy-powered static site for a collection of web games.

## Quick start

```bash
npm install
npm start        # dev server at http://localhost:8080
npm run build    # production build → _site/
```

---

## Project structure

```
games-site/
├── _data/
│   ├── baseUrls.json       ← CDN base URLs (edit here to change CDN roots)
│   ├── htmlGames.json      ← HTML5 games list
│   ├── ruffleGames.json    ← Flash/Ruffle games list
│   └── webPorts.json       ← Web ports list
│
├── _includes/
│   ├── game-card.njk       ← Single card partial (Nunjucks)
│   └── games-grid.njk      ← Grid shell + data seeding script
│
├── _layouts/
│   └── base.njk            ← Base HTML layout (header, nav, footer)
│
├── src/
│   ├── index.njk           ← All games page  → /
│   ├── html-games/index.njk → /html-games/
│   ├── ruffle/index.njk    → /ruffle/
│   ├── web-ports/index.njk → /web-ports/
│   ├── play/index.njk      → /play/   (iframe player)
│   ├── data-html.njk       → /data/htmlGames.json   (runtime fetch)
│   ├── data-ruffle.njk     → /data/ruffleGames.json
│   └── data-webports.njk   → /data/webPorts.json
│
├── public/
│   ├── css/style.css       ← Structural styles (ready for your styling)
│   └── js/games-loader.js  ← Sort, search, infinite scroll, lazy images
│
└── .eleventy.js            ← Eleventy config (base URLs, passthrough, etc.)
```

---

## Adding games

Edit the relevant JSON file in `_data/`. Each entry looks like:

```json
{
  "name":        "Cut the Rope",
  "slug":        "cut-the-rope",
  "path":        "CutTheRope/index.html",
  "thumbnail":   "CutTheRope/thumbnail.jpg",
  "description": "Feed candy to Om Nom by cutting ropes."
}
```

- **`path`** is appended to the base URL for that game type to form the full CDN link.
- **`thumbnail`** is similarly appended to the base URL.
- **`slug`** must be unique across all games — it's used in the `?game=` query param.

---

## Base URLs

Defined in `_data/baseUrls.json` and mirrored in `.eleventy.js`:

| Type       | Base URL |
|------------|----------|
| `html`     | `https://rawcdn.githack.com/ajtabjs/wl-main/tree/master` |
| `ruffle`   | `https://rawcdn.githack.com/ajtabjs/wl-ruffle/tree/master` |
| `webPorts` | `https://rawcdn.githack.com/ajtabjs/wl-ports/tree/main` |

---

## How the play page works

`/play/?game=cut-the-rope&type=html`

1. Reads `?game` and `?type` from the URL.
2. Fetches `/data/{type}Games.json` at runtime.
3. Finds the matching entry by slug.
4. Constructs `baseUrl[type] + "/" + game.path` and sets it as the iframe `src`.

---

## Infinite scroll & lazy loading

`public/js/games-loader.js` handles everything client-side:

- Games are loaded in chunks of 50 using `IntersectionObserver` on a sentinel element at the bottom of the grid.
- Thumbnails use a separate `IntersectionObserver` and only load when the card enters the viewport.
- Sort (A→Z / Z→A) and search (name substring match) re-apply instantly and reset the chunk counter, so only the first 50 results of any filtered/sorted view are loaded initially.

---

## Styling

All styling lives in `public/css/style.css`. The structural skeleton is there — layout, grid, card shape, iframe sizing — with only minimal neutral colours so your team can design freely on top.
