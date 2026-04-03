/**
 * games-loader.js
 * Reads window.__GAMES_DATA__ and window.__BASE_URLS__ (seeded by games-grid.njk),
 * then handles:
 *   - Alphabetical sorting (A→Z / Z→A)
 *   - Search filtering
 *   - Infinite scroll in chunks of 50
 *   - Lazy-loading thumbnails via IntersectionObserver
 */

(function () {
  "use strict";

  const CHUNK_SIZE = 50;

  const TYPE_LABELS = {
    html:      "HTML5",
    ruffle:    "Flash / Ruffle",
    webPorts:  "Web Port"
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let allGames      = [];   // full source list (never mutated)
  let filteredGames = [];   // after search + sort
  let loadedCount   = 0;    // how many cards are currently in the DOM
  let loading       = false;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const grid      = document.getElementById("games-grid");
  const sentinel  = document.getElementById("games-sentinel");
  const statusEl  = document.getElementById("games-status");
  const searchEl  = document.getElementById("games-search");
  const sortEl    = document.getElementById("games-sort");

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (!window.__GAMES_DATA__ || !window.__BASE_URLS__) {
      console.error("games-loader: __GAMES_DATA__ or __BASE_URLS__ not found.");
      return;
    }

    allGames = window.__GAMES_DATA__;
    applyFilters();

    // Controls
    searchEl.addEventListener("input",  debounce(onSearch, 200));
    sortEl.addEventListener("change",   onSort);

    // Infinite scroll via IntersectionObserver
    const observer = new IntersectionObserver(onSentinelVisible, {
      rootMargin: "200px"  // start loading a bit before the bottom
    });
    observer.observe(sentinel);
  }

  // ── Filtering & sorting ───────────────────────────────────────────────────
  function applyFilters() {
    const query     = (searchEl.value || "").trim().toLowerCase();
    const sortValue = sortEl.value;

    // 1. Filter
    let result = query
      ? allGames.filter(g => g.name.toLowerCase().includes(query))
      : allGames.slice();

    // 2. Sort
    result.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortValue === "alpha-desc" ? -cmp : cmp;
    });

    filteredGames = result;
    loadedCount   = 0;
    grid.innerHTML = "";
    loadNextChunk();
  }

  function onSearch() { applyFilters(); }
  function onSort()   { applyFilters(); }

  // ── Chunk loading ─────────────────────────────────────────────────────────
  function loadNextChunk() {
    if (loading) return;
    if (loadedCount >= filteredGames.length) {
      setStatus(filteredGames.length === 0 ? "No games found." : "");
      return;
    }

    loading = true;

    const slice = filteredGames.slice(loadedCount, loadedCount + CHUNK_SIZE);
    const frag  = document.createDocumentFragment();

    slice.forEach(game => {
      frag.appendChild(buildCard(game));
    });

    grid.appendChild(frag);
    loadedCount += slice.length;
    loading      = false;

    const remaining = filteredGames.length - loadedCount;
    if (remaining > 0) {
      setStatus(`Showing ${loadedCount} of ${filteredGames.length} games`);
    } else {
      setStatus(`${filteredGames.length} game${filteredGames.length !== 1 ? "s" : ""} total`);
    }
  }

  function onSentinelVisible(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadNextChunk();
      }
    });
  }

  // ── Card builder ──────────────────────────────────────────────────────────
  function buildCard(game) {
    const baseUrl    = window.__BASE_URLS__[game.type] || "";
    const thumbUrl   = `${baseUrl}/${game.thumbnail}`;
    const playUrl    = `/play/?game=${encodeURIComponent(game.slug)}&type=${encodeURIComponent(game.type)}`;
    const typeLabel  = TYPE_LABELS[game.type] || game.type;

    const card = document.createElement("a");
    card.href      = playUrl;
    card.className = "game-card";
    card.setAttribute("data-name", game.name);

    card.innerHTML = `
      <div class="game-card__thumb">
        <img
          data-src="${escHtml(thumbUrl)}"
          alt="${escHtml(game.name)} thumbnail"
          class="game-card__img lazy"
          width="320"
          height="180"
        />
      </div>
      <div class="game-card__info">
        <h3 class="game-card__title">${escHtml(game.name)}</h3>
        <p class="game-card__desc">${escHtml(game.description)}</p>
        <span class="game-card__type game-card__type--${escHtml(game.type)}">${escHtml(typeLabel)}</span>
      </div>
    `;

    // Lazy-load the image
    lazyLoadImg(card.querySelector("img.lazy"));

    return card;
  }

  // ── Lazy image loading ────────────────────────────────────────────────────
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove("lazy");
        imgObserver.unobserve(img);
      }
    });
  }, { rootMargin: "100px" });

  function lazyLoadImg(img) {
    imgObserver.observe(img);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
