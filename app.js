(function () {
  "use strict";

  const STORAGE_KEY = "bingo-cards.v1";
  const app = document.getElementById("app");

  // --- storage -----------------------------------------------------------

  function loadCards() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("Failed to read cards from localStorage", err);
      return [];
    }
  }

  function saveCards(cards) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  function getCard(id) {
    return loadCards().find((c) => c.id === id) || null;
  }

  function upsertCard(card) {
    const cards = loadCards();
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx >= 0) cards[idx] = card;
    else cards.unshift(card);
    saveCards(cards);
  }

  function deleteCard(id) {
    saveCards(loadCards().filter((c) => c.id !== id));
  }

  // --- helpers -----------------------------------------------------------

  function uid() {
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    );
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildGrid(card) {
    const size = card.size;
    const total = size * size;
    const cells = new Array(total).fill(null);
    const centerIndex =
      card.freeSpace && size % 2 === 1
        ? Math.floor(total / 2)
        : -1;

    const source = card.shuffle ? shuffle(card.items) : card.items.slice();
    let src = 0;
    for (let i = 0; i < total; i++) {
      if (i === centerIndex) {
        cells[i] = { text: "FREE", free: true };
      } else {
        const text = source[src++ % source.length];
        cells[i] = { text, free: false };
      }
    }
    return { cells, centerIndex };
  }

  function detectWins(marks, size) {
    const wins = new Set();
    // rows
    for (let r = 0; r < size; r++) {
      let ok = true;
      for (let c = 0; c < size; c++) {
        if (!marks[r * size + c]) { ok = false; break; }
      }
      if (ok) for (let c = 0; c < size; c++) wins.add(r * size + c);
    }
    // cols
    for (let c = 0; c < size; c++) {
      let ok = true;
      for (let r = 0; r < size; r++) {
        if (!marks[r * size + c]) { ok = false; break; }
      }
      if (ok) for (let r = 0; r < size; r++) wins.add(r * size + c);
    }
    // diag TL→BR
    let ok = true;
    for (let i = 0; i < size; i++) {
      if (!marks[i * size + i]) { ok = false; break; }
    }
    if (ok) for (let i = 0; i < size; i++) wins.add(i * size + i);
    // diag TR→BL
    ok = true;
    for (let i = 0; i < size; i++) {
      if (!marks[i * size + (size - 1 - i)]) { ok = false; break; }
    }
    if (ok) for (let i = 0; i < size; i++) wins.add(i * size + (size - 1 - i));
    return wins;
  }

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  function fromTemplate(id) {
    const tpl = document.getElementById(id);
    return tpl.content.cloneNode(true);
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // --- views -------------------------------------------------------------

  function renderHome() {
    clear(app);
    const frag = fromTemplate("tpl-home");
    const section = frag.querySelector(".home");
    const list = section.querySelector(".card-list");
    const empty = section.querySelector(".empty");
    const cards = loadCards();

    if (cards.length === 0) {
      empty.hidden = false;
      list.remove();
    } else {
      for (const card of cards) {
        const item = fromTemplate("tpl-card-item");
        const link = item.querySelector(".card-link");
        const title = item.querySelector(".card-title");
        const meta = item.querySelector(".card-meta");
        link.href = `#/c/${card.id}`;
        title.textContent = card.title;
        const markedCount = (card.marks || []).filter(Boolean).length;
        const total = card.size * card.size;
        meta.textContent = `${card.size} × ${card.size} · ${markedCount} / ${total} marked`;

        item.querySelector(".btn-reset").addEventListener("click", () => {
          const fresh = getCard(card.id);
          if (!fresh) return;
          fresh.marks = new Array(fresh.size * fresh.size).fill(false);
          if (fresh.freeSpace && fresh.size % 2 === 1) {
            fresh.marks[Math.floor(fresh.marks.length / 2)] = true;
          }
          upsertCard(fresh);
          renderHome();
        });

        item.querySelector(".btn-delete").addEventListener("click", () => {
          if (confirm(`Delete "${card.title}"? This cannot be undone.`)) {
            deleteCard(card.id);
            renderHome();
          }
        });

        list.appendChild(item);
      }
    }

    app.appendChild(frag);
  }

  function renderEditor(existing) {
    clear(app);
    const frag = fromTemplate("tpl-new");
    const section = frag.querySelector(".editor");
    const heading = section.querySelector("#editor-heading");
    const form = section.querySelector(".editor-form");
    const itemsInput = form.elements["items"];
    const countHint = form.querySelector(".count-hint");
    const sizeInput = form.elements["size"];
    const freeSpaceInput = form.elements["freeSpace"];

    if (existing) {
      heading.textContent = "Edit Bingo Card";
      form.elements["title"].value = existing.title;
      form.elements["size"].value = String(existing.size);
      form.elements["freeSpace"].checked = !!existing.freeSpace;
      form.elements["shuffle"].checked = !!existing.shuffle;
      form.elements["items"].value = existing.items.join("\n");
    }

    function parseItems() {
      return itemsInput.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    function updateHint() {
      const size = parseInt(sizeInput.value, 10);
      const free = freeSpaceInput.checked && size % 2 === 1;
      const needed = size * size - (free ? 1 : 0);
      const have = parseItems().length;
      let msg = `${have} ${plural(have, "item", "items")} entered · need ${needed} for ${size} × ${size}`;
      if (have < needed) {
        msg += " (items will repeat to fill the grid)";
      } else if (have > needed && form.elements["shuffle"].checked) {
        msg += " (extras may be unused after shuffle)";
      }
      countHint.textContent = msg;
    }

    itemsInput.addEventListener("input", updateHint);
    sizeInput.addEventListener("change", updateHint);
    freeSpaceInput.addEventListener("change", updateHint);
    form.elements["shuffle"].addEventListener("change", updateHint);
    updateHint();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = form.elements["title"].value.trim();
      const size = parseInt(form.elements["size"].value, 10);
      const freeSpace = form.elements["freeSpace"].checked;
      const shuffleItems = form.elements["shuffle"].checked;
      const items = parseItems();

      if (!title) {
        alert("Please give the card a title.");
        return;
      }
      if (items.length === 0) {
        alert("Please enter at least one item.");
        return;
      }

      const card = existing ? { ...existing } : { id: uid(), createdAt: Date.now() };
      card.title = title;
      card.size = size;
      card.freeSpace = freeSpace;
      card.shuffle = shuffleItems;
      card.items = items;
      card.updatedAt = Date.now();

      const grid = buildGrid(card);
      card.cells = grid.cells.map((c) => c.text);
      card.freeIndices = grid.cells
        .map((c, i) => (c.free ? i : -1))
        .filter((i) => i >= 0);
      card.marks = new Array(card.size * card.size).fill(false);
      for (const i of card.freeIndices) card.marks[i] = true;

      upsertCard(card);
      location.hash = `#/c/${card.id}`;
    });

    app.appendChild(frag);
    form.elements["title"].focus();
  }

  function renderPlay(id) {
    const card = getCard(id);
    if (!card) {
      clear(app);
      app.appendChild(fromTemplate("tpl-not-found"));
      return;
    }

    clear(app);
    const frag = fromTemplate("tpl-play");
    const section = frag.querySelector(".play");
    section.querySelector(".play-title").textContent = card.title;

    const grid = section.querySelector(".bingo-grid");
    const banner = section.querySelector(".bingo-banner");
    const progress = section.querySelector(".play-progress");

    grid.style.gridTemplateColumns = `repeat(${card.size}, 1fr)`;

    const freeSet = new Set(card.freeIndices || []);

    function render() {
      clear(grid);
      const wins = detectWins(card.marks, card.size);
      let markedCount = 0;

      for (let i = 0; i < card.cells.length; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bingo-cell";
        btn.textContent = card.cells[i];
        if (freeSet.has(i)) btn.classList.add("free");
        if (card.marks[i]) {
          btn.classList.add("marked");
          markedCount++;
        }
        if (wins.has(i)) btn.classList.add("win");

        if (!freeSet.has(i)) {
          btn.addEventListener("click", () => {
            card.marks[i] = !card.marks[i];
            upsertCard(card);
            render();
          });
        }
        grid.appendChild(btn);
      }

      banner.hidden = wins.size === 0;
      const total = card.cells.length;
      progress.textContent = `${markedCount} / ${total} marked`;
    }

    render();

    section.querySelector(".btn-reset").addEventListener("click", () => {
      if (!confirm("Clear all marks on this card?")) return;
      card.marks = new Array(card.size * card.size).fill(false);
      for (const i of freeSet) card.marks[i] = true;
      upsertCard(card);
      render();
    });

    section.querySelector(".btn-edit").addEventListener("click", () => {
      location.hash = `#/c/${card.id}/edit`;
    });

    section.querySelector(".btn-delete").addEventListener("click", () => {
      if (confirm(`Delete "${card.title}"? This cannot be undone.`)) {
        deleteCard(card.id);
        location.hash = "#/";
      }
    });

    app.appendChild(frag);
  }

  // --- routing -----------------------------------------------------------

  function route() {
    const hash = location.hash || "#/";
    const path = hash.replace(/^#/, "");

    if (path === "/" || path === "") {
      renderHome();
      return;
    }
    if (path === "/new") {
      renderEditor(null);
      return;
    }
    const editMatch = path.match(/^\/c\/([^/]+)\/edit$/);
    if (editMatch) {
      const card = getCard(editMatch[1]);
      if (!card) {
        clear(app);
        app.appendChild(fromTemplate("tpl-not-found"));
        return;
      }
      renderEditor(card);
      return;
    }
    const playMatch = path.match(/^\/c\/([^/]+)$/);
    if (playMatch) {
      renderPlay(playMatch[1]);
      return;
    }
    renderHome();
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", route);
})();
