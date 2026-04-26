import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const WIKI_API_URL = "https://terraria.wiki.gg/api.php";
const PAGE_LIST_PATH = path.join(process.cwd(), "scripts", "wikiPageTitles.json");

const commandLineArgs = process.argv.slice(2);
const shouldReadFromList = commandLineArgs.includes("--from-list");

async function getPageTitles() {
  if (shouldReadFromList) {
    const pageListFile = await readFile(PAGE_LIST_PATH, "utf-8");
    const pageTitles = JSON.parse(pageListFile);

    if (!Array.isArray(pageTitles)) {
      throw new Error("wikiPageTitles.json must contain an array of page titles.");
    }

    return pageTitles;
  }

  return commandLineArgs;
}

function createSafeFileName(title) {
  return title
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeHtmlEntities(text) {
  const namedEntities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return text.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (match, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return namedEntities[entity] || match;
  });
}

function removeUnwantedWikiHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<table[\s\S]*?<\/table>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(
      /<div[^>]*class="[^"]*(navbox|metadata|ambox|hatnote|toc|mw-editsection|printfooter)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      " ",
    );
}

function removeLowValueLines(text) {
  const lowValueLines = new Set([
    "statistics",
    "achievements",
    "history",
    "references",
    "contents",
    "navigation",
    "notes",
  ]);

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !lowValueLines.has(line.toLowerCase()))
    .join("\n");
}

function cleanHtmlToText(html) {
  return decodeHtmlEntities(removeUnwantedWikiHtml(html))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\s*edit\s*\]/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return removeLowValueLines(cleanedText).trim();
}

async function fetchWikiPage(title) {
  const url = new URL(WIKI_API_URL);

  url.searchParams.set("action", "parse");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "text");
  url.searchParams.set("redirects", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "terraria-ai-assistant/0.1 learning project by cordarrohiggins",
    },
  });

  if (!response.ok) {
    throw new Error(`Wiki request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.info || `No wiki page found for title: ${title}`);
  }

  const parsedPage = data.parse;
  const html = parsedPage?.text;

  if (!parsedPage || !html) {
    throw new Error(`No page text found for title: ${title}`);
  }

  const extract = cleanHtmlToText(html);

  return {
    title: parsedPage.title,
    pageId: parsedPage.pageid,
    sourceUrl: `https://terraria.wiki.gg/wiki/${encodeURIComponent(
      parsedPage.title.replaceAll(" ", "_"),
    )}`,
    extract,
    fetchedAt: new Date().toISOString(),
  };
}

async function saveWikiPage(wikiPage) {
  const outputDirectory = path.join(process.cwd(), "wiki-output");
  await mkdir(outputDirectory, { recursive: true });

  const fileName = `${createSafeFileName(wikiPage.title)}.json`;
  const outputPath = path.join(outputDirectory, fileName);

  await writeFile(outputPath, JSON.stringify(wikiPage, null, 2), "utf-8");

  return outputPath;
}

async function main() {
  try {
    const pageTitles = await getPageTitles();

    if (pageTitles.length === 0) {
      console.error("Please provide at least one wiki page title.");
      console.error('Example: node scripts/fetchWikiPage.mjs "Night\'s Edge" "Wings"');
      console.error("Or use: node scripts/fetchWikiPage.mjs --from-list");
      process.exit(1);
    }

    let successCount = 0;
    let failureCount = 0;

    for (const title of pageTitles) {
      try {
        console.log(`\nFetching: ${title}`);

        const wikiPage = await fetchWikiPage(title);
        const outputPath = await saveWikiPage(wikiPage);

        successCount += 1;

        console.log(`Fetched: ${wikiPage.title}`);
        console.log(`Text length: ${wikiPage.extract.length} characters`);
        console.log(`Saved to: ${outputPath}`);
      } catch (error) {
        failureCount += 1;

        console.error(`Failed to fetch: ${title}`);

        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error(error);
        }
      }
    }

    console.log("\nFetch complete.");
    console.log(`Successful pages: ${successCount}`);
    console.log(`Failed pages: ${failureCount}`);

    if (failureCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Failed to start wiki fetch.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();