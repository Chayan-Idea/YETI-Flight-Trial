(() => {
  const search = document.querySelector("#search");
  const filters = document.querySelector("#filters");
  const docs = document.querySelector("#documents");
  const status = document.querySelector("#status");
  const empty = document.querySelector("#empty");
  const count = document.querySelector("#doc-count");
  let items = [];
  let category = "All";

  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function renderFilters() {
    const categories = ["All", ...new Set(items.map((item) => item.category).filter(Boolean).sort())];
    filters.innerHTML = categories.map((name) =>
      '<button class="filter' + (name === category ? ' active' : '') + '" type="button" data-category="' + safe(name) + '">' + safe(name) + '</button>'
    ).join("");
  }

  function render() {
    const term = search.value.trim().toLowerCase();
    const shown = items.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const text = [item.title, item.filename, item.category, item.description].join(" ").toLowerCase();
      return matchesCategory && text.includes(term);
    });
    count.textContent = shown.length + (shown.length === 1 ? " document" : " documents");
    docs.innerHTML = shown.map((item) => {
      const path = String(item.path || "");
      const safePath = /^(https:\/\/|\.\/|files\/)/i.test(path) ? path : "";
      return '<article class="doc-card"><div class="file-icon">PDF</div><div class="doc-info">' +
        '<div class="doc-category">' + safe(item.category || "Uncategorised") + '</div>' +
        '<h3>' + safe(item.title || item.filename || "Untitled document") + '</h3>' +
        (item.description ? '<p>' + safe(item.description) + '</p>' : '<p>' + safe(item.filename || "Published document") + '</p>') +
        (safePath ? '<a class="doc-link" href="' + safe(safePath) + '" target="_blank" rel="noopener noreferrer">Open document ↗</a>' : '<span class="doc-link">No file link configured</span>') +
        '</div></article>';
    }).join("");
    status.hidden = true;
    empty.hidden = shown.length !== 0;
    docs.hidden = shown.length === 0;
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    category = button.dataset.category;
    renderFilters();
    render();
  });
  search.addEventListener("input", render);

  fetch("./catalog.json")
    .then((response) => {
      if (!response.ok) throw new Error("Could not load catalog");
      return response.json();
    })
    .then((data) => {
      items = Array.isArray(data) ? data : (Array.isArray(data.documents) ? data.documents : []);
      renderFilters();
      render();
      if (items.length === 0) {
        status.hidden = false;
        status.textContent = "The library is ready. No documents have been published yet.";
        empty.hidden = true;
        docs.hidden = true;
      }
    })
    .catch(() => {
      status.hidden = false;
      status.textContent = "The document index could not be loaded. Please try again later.";
      docs.hidden = true;
    });
})();