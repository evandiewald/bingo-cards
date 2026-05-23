(function () {
  "use strict";

  const STORAGE_KEY = "bingo-cards.v1";
  const app = document.getElementById("app");

  const PRESETS = [
    {
      id: "hot-fish-club",
      name: "Hot Fish Club — Murrells Inlet, SC",
      title: "Hot Fish Club Bar Night",
      size: 5,
      freeSpace: true,
      shuffle: true,
      items: [
        "Spot someone in Salt Life gear",
        "Hear a Jimmy Buffett song",
        "See a boat pull up to the dock",
        "Order a dozen oysters",
        "Watch the sunset over the marsh",
        "Spot a pelican",
        "Get a drink served in a mason jar",
        "Hear someone say \"y'all\"",
        "See a Clemson shirt",
        "See a Gamecocks shirt",
        "Spot a bachelorette party",
        "Hear a fishing story bigger than the fish",
        "Get a beer in a koozie",
        "See someone wearing socks with sandals",
        "Spot a golf cart in the parking lot",
        "Order hush puppies",
        "Tip the live band",
        "See a couple in matching outfits",
        "Take a selfie on the MarshWalk",
        "Spot dolphins in the inlet",
        "Hear \"Sweet Caroline\" and sing along",
        "Order shrimp & grits",
        "See someone spill a drink",
        "Spot a Yeti cooler",
        "Smell the pluff mud",
        "Get sand somewhere it shouldn't be",
        "Watch someone struggle to shuck an oyster",
        "Order a rum punch or Painkiller",
        "Hear a Zac Brown Band song",
        "Befriend a stranger at the bar",
      ],
    },
    {
      id: "road-trip",
      name: "Road Trip",
      title: "Road Trip Bingo",
      size: 5,
      freeSpace: true,
      shuffle: true,
      items: [
        "Out-of-state license plate",
        "Cow in a field",
        "\"Are we there yet?\"",
        "Gas station snack haul",
        "Truck honks back at a wave",
        "Construction zone",
        "Roadkill (sorry)",
        "Billboard with a typo",
        "Sing along to a song",
        "Someone falls asleep",
        "Detour or wrong turn",
        "Bug splat on the windshield",
        "Stop at a scenic overlook",
        "See a hitchhiker",
        "Drive-thru meal in the car",
        "Yellow car",
        "Motorcycle convoy",
        "Cop on the shoulder",
        "Phone dies / charger drama",
        "Argue about directions",
        "Snap a road photo",
        "RV bigger than a house",
        "Rest stop bathroom adventure",
        "Pass a state welcome sign",
      ],
    },
    {
      id: "boring-meeting",
      name: "Boring Meeting",
      title: "Meeting Bingo",
      size: 5,
      freeSpace: true,
      shuffle: true,
      items: [
        "\"Can everyone see my screen?\"",
        "\"You're on mute.\"",
        "\"Let's take this offline.\"",
        "\"Circle back\"",
        "\"Synergy\"",
        "Dog barks in background",
        "Someone joins 5+ minutes late",
        "\"Sorry, I was on mute.\"",
        "Awkward silence",
        "\"Can you share that link?\"",
        "Screen share fails",
        "\"Quick question...\" (not quick)",
        "\"Let's parking-lot that\"",
        "Camera off the whole time",
        "\"Per my last email\"",
        "Meeting could have been an email",
        "\"Action items?\"",
        "Wrong meeting joined",
        "\"Just to play devil's advocate\"",
        "Slide deck loads slowly",
        "Someone eating on camera",
        "\"Let's take it from the top\"",
        "Meeting runs over",
        "Background noise / sirens",
      ],
    },
  ];

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

  function slugify(s) {
    return (
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "bingo-card"
    );
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function cardToDefinition(card) {
    return {
      type: "bingo-cards.card",
      version: 1,
      title: card.title,
      size: card.size,
      freeSpace: !!card.freeSpace,
      shuffle: card.shuffle !== false,
      items: card.items.slice(),
    };
  }

  function exportCard(card) {
    downloadJson(`${slugify(card.title)}.bingo.json`, cardToDefinition(card));
  }

  function normalizeImportedCard(obj) {
    if (!obj || typeof obj !== "object") return null;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const size = parseInt(obj.size, 10);
    const items = Array.isArray(obj.items)
      ? obj.items.map((s) => String(s).trim()).filter(Boolean)
      : [];
    if (!title || ![3, 4, 5].includes(size) || items.length === 0) return null;
    return {
      title,
      size,
      freeSpace: obj.freeSpace !== false,
      shuffle: obj.shuffle !== false,
      items,
    };
  }

  function createCardFromDefinition(def) {
    const card = {
      id: uid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      title: def.title,
      size: def.size,
      freeSpace: def.freeSpace,
      shuffle: def.shuffle,
      items: def.items,
    };
    const grid = buildGrid(card);
    card.cells = grid.cells.map((c) => c.text);
    card.freeIndices = grid.cells
      .map((c, i) => (c.free ? i : -1))
      .filter((i) => i >= 0);
    card.marks = new Array(card.size * card.size).fill(false);
    for (const i of card.freeIndices) card.marks[i] = true;
    return card;
  }

  async function importFromFile(file) {
    let text;
    try {
      text = await file.text();
    } catch {
      alert("Couldn't read that file.");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      alert("That file isn't valid JSON.");
      return;
    }

    let defs = [];
    if (Array.isArray(parsed)) {
      defs = parsed.map(normalizeImportedCard).filter(Boolean);
    } else if (
      parsed &&
      parsed.type === "bingo-cards.export" &&
      Array.isArray(parsed.cards)
    ) {
      defs = parsed.cards.map(normalizeImportedCard).filter(Boolean);
    } else {
      const single = normalizeImportedCard(parsed);
      if (single) defs = [single];
    }

    if (defs.length === 0) {
      alert(
        "No valid bingo cards found in that file. Expected a card with a title, size (3/4/5), and items."
      );
      return;
    }

    const existing = loadCards();
    const newCards = defs.map(createCardFromDefinition);
    saveCards([...newCards, ...existing]);

    if (newCards.length === 1) {
      location.hash = `#/c/${newCards[0].id}`;
    } else {
      alert(`Imported ${newCards.length} cards.`);
      if (location.hash === "#/" || location.hash === "") route();
      else location.hash = "#/";
    }
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
      empty
        .querySelector(".btn-import")
        .addEventListener("click", triggerImport);
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

        item.querySelector(".btn-export").addEventListener("click", () => {
          const fresh = getCard(card.id);
          if (fresh) exportCard(fresh);
        });

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
    const presetSelect = form.elements["preset"];

    for (const p of PRESETS) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      presetSelect.appendChild(opt);
    }

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

    presetSelect.addEventListener("change", () => {
      const preset = PRESETS.find((p) => p.id === presetSelect.value);
      if (!preset) return;
      const hasContent =
        form.elements["title"].value.trim() || itemsInput.value.trim();
      if (
        hasContent &&
        !confirm("Loading a preset will replace the current title and items. Continue?")
      ) {
        presetSelect.value = "";
        return;
      }
      form.elements["title"].value = preset.title;
      form.elements["size"].value = String(preset.size);
      form.elements["freeSpace"].checked = !!preset.freeSpace;
      if (typeof preset.shuffle === "boolean") {
        form.elements["shuffle"].checked = preset.shuffle;
      }
      itemsInput.value = shuffle(preset.items).join("\n");
      updateHint();
    });

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

    section.querySelector(".btn-export").addEventListener("click", () => {
      exportCard(card);
    });

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

  // --- topbar: import ----------------------------------------------------

  function triggerImport() {
    const input = document.getElementById("import-file");
    if (input) input.click();
  }

  function setupTopbar() {
    const btn = document.getElementById("import-btn");
    const input = document.getElementById("import-file");
    if (btn && input) {
      btn.addEventListener("click", triggerImport);
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        input.value = "";
        if (file) importFromFile(file);
      });
    }
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", () => {
    setupTopbar();
    route();
  });
})();
