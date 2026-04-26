import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const WIKI_API_URL = "https://terraria.wiki.gg/api.php";
const DISCOVERY_CONFIG_PATH = path.join(
  process.cwd(),
  "scripts",
  "wikiDiscoveryConfig.json",
);
const PAGE_TITLES_OUTPUT_PATH = path.join(
  process.cwd(),
  "scripts",
  "wikiPageTitles.json",
);

async function readDiscoveryConfig() {
  const fileContents = await readFile(DISCOVERY_CONFIG_PATH, "utf-8");
  const config = JSON.parse(fileContents);

  if (!Array.isArray(config.manualPages)) {
    throw new Error("wikiDiscoveryConfig.json must include manualPages as an array.");
  }

  if (!Array.isArray(config.categories)) {
    throw new Error("wikiDiscoveryConfig.json must include categories as an array.");
  }

  return config;
}

async function fetchCategoryMembers(categoryName, limit) {
  const pageTitles = [];
  let continuationToken;

  do {
    const url = new URL(WIKI_API_URL);

    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", `Category:${categoryName}`);
    url.searchParams.set("cmnamespace", "0");
    url.searchParams.set("cmlimit", String(Math.min(limit, 500)));

    if (continuationToken) {
      url.searchParams.set("cmcontinue", continuationToken);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "terraria-ai-assistant/0.1 learning project by cordarrohiggins",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Category request failed for ${categoryName} with status ${response.status}`,
      );
    }

    const data = await response.json();
    const members = data.query?.categorymembers || [];

    for (const member of members) {
      if (member.title && pageTitles.length < limit) {
        pageTitles.push(member.title);
      }
    }

    continuationToken = data.continue?.cmcontinue;

    if (pageTitles.length >= limit) {
      break;
    }
  } while (continuationToken);

  return pageTitles;
}

function getUniqueSortedTitles(titles) {
  return [...new Set(titles)]
    .map((title) => title.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  try {
    const config = await readDiscoveryConfig();

    const discoveredTitles = [];

    for (const category of config.categories) {
      console.log(`\nDiscovering category: ${category.name}`);

      const categoryTitles = await fetchCategoryMembers(
        category.name,
        category.limit || 100,
      );

      console.log(`Found ${categoryTitles.length} pages`);

      discoveredTitles.push(...categoryTitles);
    }

    const allTitles = getUniqueSortedTitles([
      ...config.manualPages,
      ...discoveredTitles,
    ]);

    await writeFile(
      PAGE_TITLES_OUTPUT_PATH,
      JSON.stringify(allTitles, null, 2),
      "utf-8",
    );

    console.log("\nDiscovery complete.");
    console.log(`Manual pages: ${config.manualPages.length}`);
    console.log(`Discovered pages: ${discoveredTitles.length}`);
    console.log(`Unique total pages: ${allTitles.length}`);
    console.log(`Saved to: ${PAGE_TITLES_OUTPUT_PATH}`);
  } catch (error) {
    console.error("Failed to discover wiki pages.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();