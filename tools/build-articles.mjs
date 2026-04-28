import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const articlesDir = path.join(root, "articles");
const assetsDir = path.join(root, "assets");
const distDir = path.join(root, "dist");
const shouldWriteDist = !process.argv.includes("--no-dist");

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

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
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
      content: blocks
    });
  }

  articles.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
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

  if (await fileExists(path.join(root, "404.html"))) {
    await copyStaticFile("404.html");
  }
}

const articlesJs = await buildArticles();
await writeFile(path.join(assetsDir, "articles.js"), articlesJs, "utf8");

if (shouldWriteDist) {
  await buildDist(articlesJs);
}

console.log(`Generated assets/articles.js${shouldWriteDist ? " and dist/" : ""}.`);
