import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const articlesDir = path.join(root, "articles");
const assetsDir = path.join(root, "assets");
const distDir = path.join(root, "dist");
const shouldWriteDist = !process.argv.includes("--no-dist");
function normalizeOrigin(value) {
  const origin = value || "https://donroe.vercel.app";
  return (origin.startsWith("http") ? origin : `https://${origin}`).replace(/\/$/, "");
}

const siteOrigin = normalizeOrigin(process.env.SITE_ORIGIN || process.env.VERCEL_PROJECT_PRODUCTION_URL);

const metadata = {
  "The Coverage Is Not the War": {
    order: 1,
    series: "Information Front",
    categories: ["Media & Narrative", "Geopolitics"],
    dek: "A report on how wartime facts pass through public filters before reaching the record.",
    keyPoints: [
      "Narrative control is a strategic objective.",
      "Speed and repetition compete with truth.",
      "The remedy is clarity, structure, and courage."
    ]
  },
  "The Shield of the Americas": {
    order: 2,
    series: "Donroe Doctrine",
    categories: ["Geopolitics", "Americas"],
    dek: "Phase 3 on the Donroe Doctrine as a permanent hemispheric alliance against cartel and adversary networks.",
    keyPoints: [
      "Coalitions matter when geography becomes strategy.",
      "Cartel power is treated as a regional security problem.",
      "The hemisphere becomes the organizing unit."
    ]
  },
  "The Donroe Doctrine and the Fall of the Shadow Empire": {
    order: 3,
    series: "Donroe Doctrine",
    categories: ["Geopolitics", "Strategy"],
    dek: "Three operations in sixty-seven days are framed as a strike against the architecture of American decline.",
    keyPoints: [
      "Energy, currency, and basing networks are treated as one system.",
      "China is the strategic center of gravity.",
      "The campaign is measured by what it disconnected."
    ]
  },
  "Why the President Who Promised No More Wars Had to Fight Three of Them": {
    order: 4,
    series: "Donroe Doctrine",
    categories: ["Geopolitics", "Strategy"],
    dek: "The opening argument for why Venezuela, Iran, and Cuba became one connected strategic theater.",
    keyPoints: [
      "Separate crises are read as a single network.",
      "The case turns on proximity, capability, and timing.",
      "Restraint is distinguished from passivity."
    ]
  },
  "Tehran's Western Front": {
    order: 5,
    series: "Information Front",
    categories: ["Geopolitics", "Media & Narrative"],
    dek: "An examination of how Iran's conflict narrative enters American politics through intermediaries.",
    keyPoints: [
      "Foreign narratives need domestic carriers.",
      "Verification is treated as a wartime discipline.",
      "The battlefield includes institutional trust."
    ]
  },
  "Meet Nikolas Bowie. The Harvard Scholar Handing Congress the Tools to Kill the Court": {
    order: 6,
    series: "Legal Front",
    categories: ["Legal Front", "Institutions"],
    dek: "A profile of the academic campaign to reduce judicial review and reshape the balance between Congress and the Court.",
    keyPoints: [
      "Credentialed arguments travel faster than slogans.",
      "Jurisdiction-stripping becomes a practical political tool.",
      "The theory has consequences beyond its authors' coalition."
    ]
  },
  "The Vatican Has Declared War on Christianity": {
    order: 7,
    series: "Rome File",
    categories: ["Theology", "Institutions"],
    dek: "A polemical brief on the gap between Christian confession and Vatican interreligious language.",
    keyPoints: [
      "Doctrine is measured by public action.",
      "Ambiguity becomes the central charge.",
      "The argument asks whether categories still mean what they say."
    ]
  },
  "Is the Pope Catholic": {
    order: 8,
    series: "Rome File",
    categories: ["Theology", "Institutions"],
    dek: "A cross-examination of papal claims, historic Catholic doctrine, and the public record of Pope Leo XIV.",
    keyPoints: [
      "The measuring stick is the creed itself.",
      "The record is tested against exclusive claims about Christ.",
      "The article turns a proverb into a doctrinal audit."
    ]
  },
  "The Shepherd's Gambit": {
    order: 9,
    series: "Rome File",
    categories: ["Theology", "Politics"],
    dek: "A long-form theological and political reading of papal strategy in the American public square.",
    keyPoints: [
      "Pastoral language is read as political leverage.",
      "The essay follows the strategic use of moral authority.",
      "The central question is who benefits from the shepherd's move."
    ]
  },
  "A Sermon Without a Verse": {
    order: 10,
    series: "Rome File",
    categories: ["Theology", "Media & Narrative"],
    dek: "A critique of religious political commentary that invokes biblical authority without quoting Scripture.",
    keyPoints: [
      "Claims of prophetic witness require textual evidence.",
      "Borrowed authority is not the same as submission.",
      "The missing verse becomes the evidence."
    ]
  }
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function contentBlocks(raw, title) {
  const blocks = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return [];
  if (blocks[0] === title) return blocks.slice(1);

  if (blocks[0].startsWith(`${title}\n`)) {
    const first = blocks[0].slice(title.length).trim();
    return first ? [first, ...blocks.slice(1)] : blocks.slice(1);
  }

  return blocks;
}

function wordCount(raw) {
  return Array.from(raw.matchAll(/\b[\p{L}\p{N}'’.-]+\b/gu)).length;
}

function excerpt(blocks, fallback) {
  if (fallback) return fallback;
  const candidate = blocks.find((block) => block.length > 80) || blocks[0] || "";
  return candidate.length > 230 ? `${candidate.slice(0, 227).trimEnd()}...` : candidate;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function articlePath(article) {
  return `articles/${article.slug}/`;
}

function articleUrl(article) {
  return `${siteOrigin}/${articlePath(article)}`;
}

function categoryText(article) {
  return article.categories.join(", ");
}

function blockKind(block) {
  const trimmed = block.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  if (/^\d+\.\s+/.test(trimmed)) return "h3";
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/.test(trimmed)) return "h2";
  if (words <= 10 && trimmed.length < 95 && !/[.!?]"?$/.test(trimmed)) return "h2";
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

function renderMeta(article) {
  return `
      <span>${escapeHtml(article.filed)}</span>
      <span>${escapeHtml(categoryText(article))}</span>
      <span>${article.readMinutes} min read</span>
    `;
}

function renderTags(article) {
  return article.categories.map((category) => `<span>${escapeHtml(category)}</span>`).join("");
}

function renderKeyPoints(article) {
  return article.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
}

function renderToc(headings) {
  return headings.length
    ? `<p class="section-label">Sections</p>${headings.slice(0, 12).map((heading) => `<a href="#${heading.id}">${escapeHtml(heading.text)}</a>`).join("")}`
    : "";
}

function renderRelated(article, articles) {
  const related = articles
    .filter((item) => item.slug !== article.slug && item.categories.some((category) => article.categories.includes(category)))
    .slice(0, 3);

  return related.map((item) => `
      <a class="related-item" href="../../${articlePath(item)}">
        <span>${escapeHtml(item.series)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${item.readMinutes} min read</small>
      </a>
    `).join("");
}

function renderAdjacentLink(article, articles, key, label) {
  const slug = article[key];
  const target = articles.find((item) => item.slug === slug);
  if (!target) return `<span class="adjacent-link muted-link"><small>${label}</small><strong>End of file</strong></span>`;
  return `<a class="adjacent-link" href="../../${articlePath(target)}"><small>${label}</small><strong>${escapeHtml(target.title)}</strong></a>`;
}

function seoHead({ title, description, path: pagePath, type = "website", keywords = [] }) {
  const canonical = `${siteOrigin}/${pagePath.replace(/^\/+/, "")}`;
  const safeTitle = escapeAttr(title);
  const safeDescription = escapeAttr(description);
  return `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="${type}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="The Donroe Dossier">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    ${keywords.length ? `<meta name="keywords" content="${escapeAttr(keywords.join(", "))}">` : ""}`;
}

function renderArticlePage(article, articles) {
  const headings = [];
  const body = article.content.map((block, index) => renderArticleBlock(block, index, headings)).join("");
  const seriesItems = articles.filter((item) => item.series === article.series);
  const seriesIndex = seriesItems.findIndex((item) => item.slug === article.slug) + 1;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
${seoHead({
    title: `${article.title} | The Donroe Dossier`,
    description: article.dek,
    path: article.canonicalPath,
    type: "article",
    keywords: [...article.categories, article.series]
  })}
    <meta property="article:published_time" content="${article.filedIso}">
    <meta property="article:section" content="${escapeAttr(article.series)}">
    ${article.categories.map((category) => `<meta property="article:tag" content="${escapeAttr(category)}">`).join("\n    ")}
    <link rel="stylesheet" href="../../assets/styles.css">
  </head>
  <body data-page="article" data-article-slug="${escapeAttr(article.slug)}">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="read-progress" aria-hidden="true"></div>

    <header class="site-masthead compact">
      <div class="top-rule">
        <p>Dispatch reader</p>
        <p>Independent commentary desk</p>
        <p>${escapeHtml(article.dossier)}</p>
      </div>
      <div class="brand-center compact-brand">
        <a class="masthead-title" href="../../index.html">The Donroe Dossier</a>
      </div>
      <nav class="primary-nav" aria-label="Main navigation">
        <a href="../../index.html">Home</a>
        <a href="../../articles.html">Articles</a>
        <a href="../../about.html">About</a>
        <a href="../../index.html#subscribe">Subscribe</a>
      </nav>
    </header>

    <main id="main" class="page-shell article-page">
      <article class="article-shell">
        <header class="article-header">
          <p class="section-label">${escapeHtml(article.series)} / ${escapeHtml(article.dossier)}</p>
          <h1>${escapeHtml(article.title)}</h1>
          <p class="article-dek">${escapeHtml(article.dek)}</p>
          <div class="article-meta">${renderMeta(article)}</div>
          <div class="tag-row">${renderTags(article)}</div>
        </header>

        <div class="article-layout">
          <aside class="reader-rail" aria-label="Reading tools">
            <div class="rail-block case-file">
              <p class="section-label">Case file</p>
              <dl>
                <div><dt>Series</dt><dd>${escapeHtml(article.series)} ${seriesIndex ? `${seriesIndex}/${seriesItems.length}` : ""}</dd></div>
                <div><dt>Words</dt><dd>${article.wordCount.toLocaleString()}</dd></div>
                <div><dt>Read</dt><dd>${article.readMinutes} min</dd></div>
              </dl>
              <ul class="check-list">${renderKeyPoints(article)}</ul>
            </div>
            <div class="rail-block">
              <p class="section-label">Reader</p>
              <div class="reader-tools" role="group" aria-label="Text size">
                <button type="button" data-reader-size="standard" aria-pressed="true">A</button>
                <button type="button" data-reader-size="large" aria-pressed="false">A+</button>
              </div>
              <button type="button" class="utility-button" data-action="copy-link">Copy link</button>
              <button type="button" class="utility-button" data-action="print">Print</button>
              <p class="form-status" role="status" aria-live="polite" data-slot="reader-status"></p>
            </div>
            <nav class="toc rail-block" aria-label="Article sections">${renderToc(headings)}</nav>
          </aside>

          <div class="article-body">${body}</div>
        </div>
      </article>

      <nav class="article-adjacent" aria-label="Article navigation">
        ${renderAdjacentLink(article, articles, "previousSlug", "Previous file")}
        ${renderAdjacentLink(article, articles, "nextSlug", "Next file")}
      </nav>

      <section class="related-section" aria-labelledby="related-title">
        <div class="section-heading">
          <p class="section-label" id="related-title">Related dispatches</p>
          <a class="text-link" href="../../articles.html">Back to archive -&gt;</a>
        </div>
        <div class="related-list">${renderRelated(article, articles)}</div>
      </section>
    </main>

    <footer class="site-footer">
      <p>The Donroe Dossier</p>
      <p><a href="../../about.html#contact">Contact</a> / <a href="../../index.html#subscribe">Subscribe</a></p>
    </footer>

    <script src="../../assets/articles.js"></script>
    <script src="../../assets/app.js"></script>
  </body>
</html>
`;
}

function render404Page() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
${seoHead({
    title: "File Not Found | The Donroe Dossier",
    description: "The requested dossier file could not be found. Return to the archive to continue reading.",
    path: "404.html"
  })}
    <link rel="stylesheet" href="assets/styles.css">
  </head>
  <body data-page="not-found">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-masthead compact">
      <div class="top-rule">
        <p>Missing file</p>
        <p>Independent commentary desk</p>
        <p>404</p>
      </div>
      <div class="brand-center compact-brand">
        <a class="masthead-title" href="index.html">The Donroe Dossier</a>
      </div>
      <nav class="primary-nav" aria-label="Main navigation">
        <a href="index.html">Home</a>
        <a href="articles.html">Articles</a>
        <a href="about.html">About</a>
        <a href="index.html#subscribe">Subscribe</a>
      </nav>
    </header>
    <main id="main" class="page-shell">
      <section class="not-found-panel" aria-labelledby="not-found-title">
        <p class="section-label">File not found</p>
        <h1 id="not-found-title">This dossier is not in the archive.</h1>
        <p>The address may have changed, or the file may not have been published yet. The archive ledger is the best way back into the record.</p>
        <a class="text-link strong-link" href="articles.html">Return to the archive -&gt;</a>
      </section>
    </main>
    <footer class="site-footer">
      <p>The Donroe Dossier</p>
      <p><a href="about.html#contact">Contact</a> / <a href="index.html#subscribe">Subscribe</a></p>
    </footer>
  </body>
</html>
`;
}

async function copyStaticFile(fileName) {
  await copyFile(path.join(root, fileName), path.join(distDir, fileName));
}

async function copyAsset(fileName) {
  await copyFile(path.join(assetsDir, fileName), path.join(distDir, "assets", fileName));
}

async function buildArticles() {
  const entries = await import("node:fs/promises").then(({ readdir }) => readdir(articlesDir, { withFileTypes: true }));
  const textFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => entry.name);

  const articles = [];

  for (const fileName of textFiles) {
    const title = path.basename(fileName, ".txt");
    const meta = metadata[title] || {
      order: 999,
      series: "General File",
      categories: ["Essays"],
      dek: "",
      keyPoints: []
    };
    const filePath = path.join(articlesDir, fileName);
    const raw = await readFile(filePath, "utf8");
    const blocks = contentBlocks(raw, title);
    const words = wordCount(raw);
    const stat = await import("node:fs/promises").then(({ stat }) => stat(filePath));

    articles.push({
      title,
      slug: slugify(title),
      dossier: `26-${String(meta.order).padStart(4, "0")}`,
      series: meta.series,
      categories: meta.categories,
      dek: excerpt(blocks, meta.dek),
      keyPoints: meta.keyPoints,
      filed: dateFormatter.format(stat.mtime),
      filedIso: stat.mtime.toISOString().slice(0, 10),
      readMinutes: Math.max(1, Math.ceil(words / 230)),
      wordCount: words,
      order: meta.order,
      sourceFile: `articles/${fileName}`,
      canonicalPath: "",
      canonicalUrl: "",
      previousSlug: null,
      nextSlug: null,
      content: blocks
    });
  }

  articles.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  articles.forEach((article, index) => {
    article.canonicalPath = articlePath(article);
    article.canonicalUrl = articleUrl(article);
    article.previousSlug = articles[index - 1]?.slug || null;
    article.nextSlug = articles[index + 1]?.slug || null;
  });
  return `/* Generated by tools/build-articles.mjs. Edit source files in /articles or metadata in the build script. */\nwindow.ARTICLE_DATA = ${JSON.stringify(articles, null, 2)};\n`;
}

async function buildDist(articlesJs) {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(path.join(distDir, "assets"), { recursive: true });

  for (const fileName of ["index.html", "articles.html", "article.html", "about.html"]) {
    await copyStaticFile(fileName);
  }

  for (const fileName of ["app.js", "styles.css", "newsprint-texture.png"]) {
    await copyAsset(fileName);
  }

  await writeFile(path.join(distDir, "assets", "articles.js"), articlesJs, "utf8");

  const articles = JSON.parse(articlesJs.replace(/^.*?window\.ARTICLE_DATA = /s, "").replace(/;\s*$/, ""));
  for (const article of articles) {
    const articleDir = path.join(distDir, "articles", article.slug);
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, "index.html"), renderArticlePage(article, articles), "utf8");
  }

  await writeFile(path.join(distDir, "404.html"), render404Page(), "utf8");
}

const articlesJs = await buildArticles();
await writeFile(path.join(assetsDir, "articles.js"), articlesJs, "utf8");

if (shouldWriteDist) {
  await buildDist(articlesJs);
}

console.log(`Generated assets/articles.js${shouldWriteDist ? " and dist/" : ""}.`);
