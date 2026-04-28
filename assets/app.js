(function () {
  const articles = (window.ARTICLE_DATA || []).slice().sort((a, b) => a.order - b.order);
  const page = document.body.dataset.page;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const articleHref = (article) => `article.html?slug=${encodeURIComponent(article.slug)}`;
  const escapeHtml = (value) =>
    String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  const categoryText = (article) => article.categories.join(", ");

  function setText(slot, value) {
    const node = $(`[data-slot="${slot}"]`);
    if (node) node.textContent = value || "";
  }

  function setHtml(slot, value) {
    const node = $(`[data-slot="${slot}"]`);
    if (node) node.innerHTML = value || "";
  }

  function metaHtml(article) {
    return `
      <span>${escapeHtml(article.filed)}</span>
      <span>${escapeHtml(categoryText(article))}</span>
      <span>${article.readMinutes} min read</span>
    `;
  }

  function tagHtml(article) {
    return article.categories.map((category) => `<span>${escapeHtml(category)}</span>`).join("");
  }

  function initForms() {
    $$("form[data-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const status = $(".form-status", form);
        const type = form.dataset.form;
        form.reset();
        if (status) {
          status.textContent = type === "contact" ? "Filed. Thank you for the note." : "Filed. You are on the list.";
        }
      });
    });
  }

  function initProgress() {
    const bar = $(".read-progress");
    if (!bar) return;

    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? doc.scrollTop / max : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  function initHome() {
    const featured = articles[0];
    if (!featured) return;

    setText("featured-title", featured.title);
    setText("featured-dek", featured.dek);
    setText("featured-dossier", featured.dossier);
    setText("featured-filed", featured.filed);
    setText("featured-categories", categoryText(featured));
    setHtml("featured-meta", metaHtml(featured));

    const link = $('[data-slot="featured-link"]');
    if (link) link.href = articleHref(featured);

    setHtml("featured-points", featured.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join(""));

    setHtml("latest-table", `
      <div class="ledger-head" aria-hidden="true">
        <span>Title</span><span>Category</span><span>Filed</span><span>Read</span>
      </div>
      ${articles.slice(0, 7).map((article) => `
        <a class="ledger-row" href="${articleHref(article)}">
          <span>${escapeHtml(article.title)}</span>
          <span>${escapeHtml(article.categories[0])}</span>
          <span>${escapeHtml(article.filed)}</span>
          <span>${article.readMinutes} min</span>
        </a>
      `).join("")}
    `);
  }

  function initArchive() {
    const search = $('[data-control="search"]');
    const filters = $('[data-slot="category-filters"]');
    const list = $('[data-slot="archive-list"]');
    const count = $('[data-slot="result-count"]');
    if (!search || !filters || !list || !count) return;

    const categories = ["All", ...new Set(articles.flatMap((article) => article.categories))].sort((a, b) => {
      if (a === "All") return -1;
      if (b === "All") return 1;
      return a.localeCompare(b);
    });

    let activeCategory = "All";
    filters.innerHTML = categories.map((category) => `
      <button type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === "All"}">${escapeHtml(category)}</button>
    `).join("");

    const render = () => {
      const query = search.value.trim().toLowerCase();
      const matches = articles.filter((article) => {
        const categoryMatch = activeCategory === "All" || article.categories.includes(activeCategory);
        const haystack = `${article.title} ${article.series} ${article.dek} ${article.categories.join(" ")}`.toLowerCase();
        return categoryMatch && (!query || haystack.includes(query));
      });

      count.textContent = `${matches.length} ${matches.length === 1 ? "article" : "articles"}`;
      list.innerHTML = matches.map((article) => `
        <article class="archive-row">
          <div>
            <p class="section-label">${escapeHtml(article.dossier)} / ${escapeHtml(article.series)}</p>
            <h2><a href="${articleHref(article)}">${escapeHtml(article.title)}</a></h2>
            <p>${escapeHtml(article.dek)}</p>
            <div class="tag-row">${tagHtml(article)}</div>
          </div>
          <dl>
            <div><dt>Filed</dt><dd>${escapeHtml(article.filed)}</dd></div>
            <div><dt>Read</dt><dd>${article.readMinutes} min</dd></div>
            <div><dt>Words</dt><dd>${article.wordCount.toLocaleString()}</dd></div>
          </dl>
        </article>
      `).join("") || `<p class="empty-state">No dispatches match that search.</p>`;
    };

    filters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-category]");
      if (!button) return;
      activeCategory = button.dataset.category;
      $$("button", filters).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      render();
    });

    search.addEventListener("input", render);
    render();
  }

  function blockKind(block) {
    const trimmed = block.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (/^\d+\.\s+/.test(trimmed)) return "h3";
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/.test(trimmed)) return "h2";
    if (wordCount <= 10 && trimmed.length < 95 && !/[.!?]"?$/.test(trimmed)) return "h2";
    return "p";
  }

  function slugId(text, index) {
    const id = text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return id || `section-${index}`;
  }

  function renderArticleBlock(block, blockIndex, headings) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const parts = lines.length > 1 ? lines : [block];

    return parts.map((part, partIndex) => {
      const kind = blockKind(part);
      const safe = escapeHtml(part).replace(/\n/g, "<br>");
      if (kind === "p") return `<p>${safe}</p>`;
      const id = slugId(part, `${blockIndex}-${partIndex}`);
      headings.push({ id, text: part, kind });
      return `<${kind} id="${id}">${safe}</${kind}>`;
    }).join("");
  }

  function initArticle() {
    if (!articles.length) return;
    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get("slug");
    const article = articles.find((item) => item.slug === requestedSlug) || articles[0];

    document.title = `${article.title} | The Donroe Dossier`;
    setText("reader-dossier", article.dossier);
    setText("article-series", `${article.series} / ${article.dossier}`);
    setText("article-title", article.title);
    setText("article-dek", article.dek);
    setHtml("article-meta", metaHtml(article));
    setHtml("article-tags", tagHtml(article));

    const body = $('[data-slot="article-body"]');
    const toc = $('[data-slot="toc"]');
    const headings = [];
    if (body) {
      body.innerHTML = article.content.map((block, index) => renderArticleBlock(block, index, headings)).join("");
    }

    if (toc) {
      toc.innerHTML = headings.length
        ? `<p class="section-label">Sections</p>${headings.slice(0, 12).map((heading) => `<a href="#${heading.id}">${escapeHtml(heading.text)}</a>`).join("")}`
        : "";
    }

    const related = articles
      .filter((item) => item.slug !== article.slug && item.categories.some((category) => article.categories.includes(category)))
      .slice(0, 3);
    setHtml("related-list", related.map((item) => `
      <a class="related-item" href="${articleHref(item)}">
        <span>${escapeHtml(item.series)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${item.readMinutes} min read</small>
      </a>
    `).join(""));

    initReaderTools();
  }

  function initReaderTools() {
    const savedSize = localStorage.getItem("readerSize") || "standard";
    document.body.dataset.readerSize = savedSize;

    $$("[data-reader-size]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.readerSize === savedSize));
      button.addEventListener("click", () => {
        const size = button.dataset.readerSize;
        document.body.dataset.readerSize = size;
        localStorage.setItem("readerSize", size);
        $$("[data-reader-size]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      });
    });

    const status = $('[data-slot="reader-status"]');
    $('[data-action="copy-link"]')?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        if (status) status.textContent = "Link copied.";
      } catch {
        if (status) status.textContent = "Copy failed. Use the address bar.";
      }
    });
    $('[data-action="print"]')?.addEventListener("click", () => window.print());
  }

  function initAbout() {
    const commitmentCards = $$(".about-grid article");
    commitmentCards.forEach((card, index) => {
      card.style.setProperty("--index", index);
    });
  }

  initForms();
  initProgress();
  if (page === "home") initHome();
  if (page === "articles") initArchive();
  if (page === "article") initArticle();
  if (page === "about") initAbout();
})();
