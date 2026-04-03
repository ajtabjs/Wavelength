/**
 * games-loader.js
 * Loads games from JSON files and renders them in the Wavelength UI.
 * To add games: edit the JSON files in /games/ folder:
 *   - htmlGames.json   → HTML5 games
 *   - ruffleGames.json → Flash/Ruffle games
 *   - webPorts.json    → Web ports
 *
 * Each game entry format:
 * {
 *   "name": "Game Name",
 *   "slug": "game-slug",        // unique ID for URL
 *   "path": "GameFolder/index.html",
 *   "thumbnail": "GameFolder/thumbnail.jpg",
 *   "description": "Game description."
 * }
 */

(function () {
  "use strict";

  const CHUNK_SIZE = 50;
  const TYPE_LABELS = {
    html: "HTML5",
    ruffle: "Flash",
    webPorts: "Web Port"
  };

  let baseUrls = {};
  let allGames = [];
  let filteredGames = [];
  let loadedCount = 0;
  let loading = false;
  let currentFilter = "all";

  // DOM refs
  let grid, sentinel, statusEl, searchEl, sortEl;

  async function init() {
    grid = document.getElementById("games-grid");
    sentinel = document.getElementById("games-sentinel");
    statusEl = document.getElementById("games-status");
    searchEl = document.getElementById("games-search");
    sortEl = document.getElementById("games-sort");

    if (!grid) return;

    try {
      // Load base URLs and all game data
      const [urlsRes, htmlRes, ruffleRes, portsRes] = await Promise.all([
        fetch("games/baseUrls.json"),
        fetch("games/htmlGames.json"),
        fetch("games/ruffleGames.json"),
        fetch("games/webPorts.json")
      ]);

      baseUrls = await urlsRes.json();
      const htmlGames = await htmlRes.json();
      const ruffleGames = await ruffleRes.json();
      const webPorts = await portsRes.json();

      // Combine all games with type tags
      allGames = [
        ...htmlGames.map(g => ({ ...g, type: "html" })),
        ...ruffleGames.map(g => ({ ...g, type: "ruffle" })),
        ...webPorts.map(g => ({ ...g, type: "webPorts" }))
      ];

      applyFilters();

      // Event listeners
      searchEl?.addEventListener("input", debounce(applyFilters, 200));
      sortEl?.addEventListener("change", applyFilters);

      // Filter buttons
      document.querySelectorAll(".games-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".games-filter-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          currentFilter = btn.dataset.filter;
          applyFilters();
        });
      });

      // Infinite scroll
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) loadNextChunk();
        });
      }, { rootMargin: "200px" });
      observer.observe(sentinel);

    } catch (err) {
      console.error("Failed to load games:", err);
      grid.innerHTML = '<div class="games-error">Failed to load games. Please refresh.</div>';
    }
  }

  function applyFilters() {
    const query = (searchEl?.value || "").trim().toLowerCase();
    const sortValue = sortEl?.value || "alpha-asc";

    // Filter by type
    let result = currentFilter === "all"
      ? allGames.slice()
      : allGames.filter(g => g.type === currentFilter);

    // Filter by search
    if (query) {
      result = result.filter(g => g.name.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortValue === "alpha-desc" ? -cmp : cmp;
    });

    filteredGames = result;
    loadedCount = 0;
    grid.innerHTML = "";
    loadNextChunk();
  }

  function loadNextChunk() {
    if (loading || loadedCount >= filteredGames.length) {
      setStatus(filteredGames.length === 0 ? "No games found." : `${filteredGames.length} game${filteredGames.length !== 1 ? "s" : ""}`);
      return;
    }

    loading = true;
    const slice = filteredGames.slice(loadedCount, loadedCount + CHUNK_SIZE);
    const frag = document.createDocumentFragment();

    slice.forEach(game => frag.appendChild(buildCard(game)));

    grid.appendChild(frag);
    loadedCount += slice.length;
    loading = false;

    const remaining = filteredGames.length - loadedCount;
    setStatus(remaining > 0 
      ? `Showing ${loadedCount} of ${filteredGames.length} games` 
      : `${filteredGames.length} game${filteredGames.length !== 1 ? "s" : ""}`);
  }

  function buildCard(game) {
    const baseUrl = baseUrls[game.type] || "";
    const thumbUrl = `${baseUrl}${game.thumbnail}`;
    const typeLabel = TYPE_LABELS[game.type] || game.type;

    const card = document.createElement("div");
    card.className = "game-card";
    card.setAttribute("data-slug", game.slug);
    card.setAttribute("data-type", game.type);
    card.onclick = () => playGame(game.slug, game.type);

    card.innerHTML = `
      <div class="game-card-thumb">
        <img data-src="${escHtml(thumbUrl)}" alt="${escHtml(game.name)}" class="lazy" />
      </div>
      <div class="game-card-info">
        <div class="game-card-title">${escHtml(game.name)}</div>
        <div class="game-card-type game-card-type--${game.type}">${escHtml(typeLabel)}</div>
      </div>
    `;

    // Lazy load image
    const img = card.querySelector("img.lazy");
    lazyLoadImg(img);

    return card;
  }

  const imgObserver = new IntersectionObserver(entries => {
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

  function playGame(slug, type) {
    // Find game data
    const game = allGames.find(g => g.slug === slug && g.type === type);
    if (!game) return;

    const baseUrl = baseUrls[type] || "";
    const gameUrl = `${baseUrl}${game.path}`;

    // Switch to iframe view
    document.getElementById("games-list-view").style.display = "none";
    document.getElementById("games-play-view").style.display = "block";
    document.getElementById("play-title").textContent = game.name;
    document.getElementById("play-type").textContent = TYPE_LABELS[type];
    document.getElementById("play-type").className = `play-type-badge play-type-badge--${type}`;
    
    const iframe = document.getElementById("game-iframe");
    iframe.src = gameUrl;
  }

  window.playGame = playGame;

  window.closeGame = function() {
    document.getElementById("games-play-view").style.display = "none";
    document.getElementById("games-list-view").style.display = "block";
    document.getElementById("game-iframe").src = "";
  };

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
