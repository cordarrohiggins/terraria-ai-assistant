import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const PAGE_TITLES_PATH = path.join(
  process.cwd(),
  "scripts",
  "wikiPageTitles.json",
);

const WIKI_OUTPUT_DIRECTORY = path.join(process.cwd(), "wiki-output");

function createSafeFileName(title) {
  return title
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const pageTitlesFile = await readFile(PAGE_TITLES_PATH, "utf-8");
  const requestedTitles = JSON.parse(pageTitlesFile);

  const fileNames = await readdir(WIKI_OUTPUT_DIRECTORY);
  const jsonFileNames = fileNames.filter((fileName) =>
    fileName.endsWith(".json"),
  );

  const savedPages = [];

  for (const fileName of jsonFileNames) {
    const filePath = path.join(WIKI_OUTPUT_DIRECTORY, fileName);
    const fileContents = await readFile(filePath, "utf-8");
    const page = JSON.parse(fileContents);

    savedPages.push({
      fileName,
      title: page.title,
      pageId: page.pageId,
      sourceUrl: page.sourceUrl,
      textLength: page.extract?.length || 0,
    });
  }

  const requestedSafeNames = requestedTitles.map((title) =>
    createSafeFileName(title),
  );

  const duplicateRequestedSafeNames = requestedSafeNames.filter(
    (safeName, index) => requestedSafeNames.indexOf(safeName) !== index,
  );

  const savedPageIds = savedPages.map((page) => page.pageId);
  const duplicateSavedPageIds = savedPageIds.filter(
    (pageId, index) => savedPageIds.indexOf(pageId) !== index,
  );

  const shortestPages = [...savedPages]
    .sort((a, b) => a.textLength - b.textLength)
    .slice(0, 10);

  console.log("Wiki output audit complete.");
  console.log(`Requested titles: ${requestedTitles.length}`);
  console.log(`Saved JSON files: ${jsonFileNames.length}`);
  console.log(`Unique saved page IDs: ${new Set(savedPageIds).size}`);
  console.log(
    `Duplicate requested safe filenames: ${
      new Set(duplicateRequestedSafeNames).size
    }`,
  );
  console.log(
    `Duplicate saved page IDs: ${new Set(duplicateSavedPageIds).size}`,
  );

  console.log("\nShortest saved pages:");
  for (const page of shortestPages) {
    console.log(
      `- ${page.title} | ${page.textLength} chars | ${page.fileName}`,
    );
  }
}

main().catch((error) => {
  console.error("Failed to audit wiki output.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});