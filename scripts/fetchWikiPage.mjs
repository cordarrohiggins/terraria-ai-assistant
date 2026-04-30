import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const WIKI_API_URL = "https://terraria.wiki.gg/api.php";
const PAGE_LIST_PATH = path.join(process.cwd(), "scripts", "wikiPageTitles.json");
const FAILURE_LOG_PATH = path.join(
  process.cwd(),
  "scripts",
  "wikiFetchFailures.json",
);

const commandLineArgs = process.argv.slice(2);
const shouldReadFromList = commandLineArgs.includes("--from-list");
const shouldForceRefetch = commandLineArgs.includes("--force");

const limitArgIndex = commandLineArgs.indexOf("--limit");
const pageLimit =
  limitArgIndex !== -1 && commandLineArgs[limitArgIndex + 1]
    ? Number.parseInt(commandLineArgs[limitArgIndex + 1], 10)
    : null;

const directPageTitles = commandLineArgs.filter((arg, index) => {
  if (arg === "--from-list" || arg === "--force" || arg === "--limit") {
    return false;
  }

  if (limitArgIndex !== -1 && index === limitArgIndex + 1) {
    return false;
  }

  return true;
});

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getPageTitles() {
  if (shouldReadFromList) {
    const pageListFile = await readFile(PAGE_LIST_PATH, "utf-8");
    const pageTitles = JSON.parse(pageListFile);

    if (!Array.isArray(pageTitles)) {
      throw new Error("wikiPageTitles.json must contain an array of page titles.");
    }

    return typeof pageLimit === "number" && pageLimit > 0
      ? pageTitles.slice(0, pageLimit)
      : pageTitles;
  }

  return typeof pageLimit === "number" && pageLimit > 0
    ? directPageTitles.slice(0, pageLimit)
    : directPageTitles;
}

function createSafeFileName(title) {
  return title
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getWikiPageOutputPath(title) {
  const outputDirectory = path.join(process.cwd(), "wiki-output");
  const fileName = `${createSafeFileName(title)}.json`;

  return path.join(outputDirectory, fileName);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

const MAX_TABLE_ROWS_TO_KEEP = 80;
const MAX_TABLE_CELL_LENGTH = 140;

function cleanTableCellText(html) {
  return decodeHtmlEntities(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\s*edit\s*\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TABLE_CELL_LENGTH);
}

function convertHtmlTableToText(tableHtml) {
  const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const rows = [];

  for (const rowHtml of rowMatches.slice(0, MAX_TABLE_ROWS_TO_KEEP)) {
    const cellMatches = rowHtml.match(/<(th|td)[^>]*>[\s\S]*?<\/\1>/gi) || [];

    const cells = cellMatches
      .map((cellHtml) => cleanTableCellText(cellHtml))
      .filter(Boolean);

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) {
    return " ";
  }

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);

  const tableLines = bodyRows.map((row) => {
    const labeledCells = row.map((cell, index) => {
      const header = headerRow[index];

      if (header && header.length <= 40 && header !== cell) {
        return `${header}: ${cell}`;
      }

      return cell;
    });

    return `- ${labeledCells.join("; ")}`;
  });

  if (tableLines.length === 0) {
    return `\n${headerRow.join("; ")}\n`;
  }

  return `\n${tableLines.join("\n")}\n`;
}

function convertTablesToText(html) {
  return html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) =>
    convertHtmlTableToText(tableHtml),
  );
}

function removeUnwantedWikiHtml(html) {
  return convertTablesToText(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
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
  const cleanedText = decodeHtmlEntities(removeUnwantedWikiHtml(html))
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

async function saveWikiPage(wikiPage, requestedTitle) {
  const outputDirectory = path.join(process.cwd(), "wiki-output");
  await mkdir(outputDirectory, { recursive: true });

  const outputPath = getWikiPageOutputPath(requestedTitle);

  const pageToSave = {
    requestedTitle,
    ...wikiPage,
  };

  await writeFile(outputPath, JSON.stringify(pageToSave, null, 2), "utf-8");

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
    let skippedCount = 0;
    let failureCount = 0;
    const failures = [];

    console.log(`Pages requested: ${pageTitles.length}`);
    console.log(`Force refetch: ${shouldForceRefetch ? "yes" : "no"}`);

    for (const title of pageTitles) {
      try {
        const outputPath = getWikiPageOutputPath(title);

        if (!shouldForceRefetch && (await fileExists(outputPath))) {
          skippedCount += 1;
          console.log(`\nSkipping existing page: ${title}`);
          continue;
        }

        console.log(`\nFetching: ${title}`);

        const wikiPage = await fetchWikiPage(title);
        const savedPath = await saveWikiPage(wikiPage, title);

        successCount += 1;

        console.log(`Fetched: ${wikiPage.title}`);
        console.log(`Text length: ${wikiPage.extract.length} characters`);
        console.log(`Saved to: ${savedPath}`);

        await sleep(150);
      } catch (error) {
        failureCount += 1;

        console.error(`Failed to fetch: ${title}`);

        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error(error);
        }

        failures.push({
          title,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("\nFetch complete.");
    console.log(`Fetched pages: ${successCount}`);
    console.log(`Skipped existing pages: ${skippedCount}`);
    console.log(`Failed pages: ${failureCount}`);

    if (failureCount > 0) {
      await writeFile(
        FAILURE_LOG_PATH,
        JSON.stringify(failures, null, 2),
        "utf-8",
      );

      console.log(`Failure log saved to: ${FAILURE_LOG_PATH}`);
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