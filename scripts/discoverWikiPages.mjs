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

  if (config.prefixes !== undefined && !Array.isArray(config.prefixes)) {
    throw new Error(
      "wikiDiscoveryConfig.json prefixes must be an array if provided.",
    );
  }

  if (
    config.excludedTitlePatterns !== undefined &&
    !Array.isArray(config.excludedTitlePatterns)
  ) {
    throw new Error(
      "wikiDiscoveryConfig.json excludedTitlePatterns must be an array if provided.",
    );
  }

  return {
    manualPages: config.manualPages,
    categories: config.categories,
    prefixes: config.prefixes || [],
    linkDiscovery: config.linkDiscovery || {
      enabled: false,
      sourceTitlePatterns: [],
      limitPerSource: 100,
      totalLimit: 1000,
    },
    excludedTitlePatterns: config.excludedTitlePatterns || [],
  };
}

function shouldExcludeTitle(title, excludedTitlePatterns) {
  const normalizedTitle = title.toLowerCase();

  return excludedTitlePatterns.some((pattern) =>
    normalizedTitle.includes(String(pattern).toLowerCase()),
  );
}

function titleMatchesAnyPattern(title, patterns) {
  const normalizedTitle = title.toLowerCase();

  return patterns.some((pattern) =>
    normalizedTitle.includes(String(pattern).toLowerCase()),
  );
}

async function fetchNamespaceMap() {
  const url = new URL(WIKI_API_URL);

  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("meta", "siteinfo");
  url.searchParams.set("siprop", "namespaces");

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "terraria-ai-assistant/0.1 learning project by cordarrohiggins",
    },
  });

  if (!response.ok) {
    throw new Error(`Namespace request failed with status ${response.status}`);
  }

  const data = await response.json();
  const rawNamespaces = data.query?.namespaces || {};
  const namespaces = Array.isArray(rawNamespaces)
    ? rawNamespaces
    : Object.values(rawNamespaces);

  const namespaceMap = new Map();

  for (const namespace of namespaces) {
    const namespaceId = Number(namespace.id);

    if (!Number.isNaN(namespaceId)) {
      namespaceMap.set(String(namespaceId), namespaceId);

      if (namespace.name) {
        namespaceMap.set(String(namespace.name).toLowerCase(), namespaceId);
      }

      if (namespace.canonical) {
        namespaceMap.set(String(namespace.canonical).toLowerCase(), namespaceId);
      }

      if (namespace["*"]) {
        namespaceMap.set(String(namespace["*"]).toLowerCase(), namespaceId);
      }
    }
  }

  return namespaceMap;
}

function getNamespaceId(namespaceMap, namespaceName) {
  if (namespaceName === undefined || namespaceName === null) {
    return 0;
  }

  const normalizedNamespaceName = String(namespaceName).toLowerCase();
  const namespaceId = namespaceMap.get(normalizedNamespaceName);

  if (namespaceId === undefined) {
    throw new Error(
      `Could not find wiki namespace named "${namespaceName}". Check the namespaceName in wikiDiscoveryConfig.json.`,
    );
  }

  return namespaceId;
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

async function fetchPagesByPrefix({ namespaceId, prefix, limit }) {
  const pageTitles = [];
  let continuationToken;

  do {
    const url = new URL(WIKI_API_URL);

    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("list", "allpages");
    url.searchParams.set("apnamespace", String(namespaceId));
    url.searchParams.set("aplimit", String(Math.min(limit, 500)));

    if (prefix) {
      url.searchParams.set("apprefix", prefix);
    }

    if (continuationToken) {
      url.searchParams.set("apcontinue", continuationToken);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "terraria-ai-assistant/0.1 learning project by cordarrohiggins",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Prefix request failed for namespace ${namespaceId} with status ${response.status}`,
      );
    }

    const data = await response.json();
    const pages = data.query?.allpages || [];

    for (const page of pages) {
      if (page.title && pageTitles.length < limit) {
        pageTitles.push(page.title);
      }
    }

    continuationToken = data.continue?.apcontinue;

    if (pageTitles.length >= limit) {
      break;
    }
  } while (continuationToken);

  return pageTitles;
}

async function fetchLinksFromPage(title, limit) {
  const linkedTitles = [];
  let continuationToken;

  do {
    const url = new URL(WIKI_API_URL);

    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    url.searchParams.set("prop", "links");
    url.searchParams.set("titles", title);
    url.searchParams.set("plnamespace", "0");
    url.searchParams.set("pllimit", String(Math.min(limit, 500)));

    if (continuationToken) {
      url.searchParams.set("plcontinue", continuationToken);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "terraria-ai-assistant/0.1 learning project by cordarrohiggins",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Link request failed for ${title} with status ${response.status}`,
      );
    }

    const data = await response.json();
    const pages = data.query?.pages || [];

    for (const page of pages) {
      const links = page.links || [];

      for (const link of links) {
        if (link.title && linkedTitles.length < limit) {
          linkedTitles.push(link.title);
        }
      }
    }

    continuationToken = data.continue?.plcontinue;

    if (linkedTitles.length >= limit) {
      break;
    }
  } while (continuationToken);

  return linkedTitles;
}

async function discoverLinkedPages({
  sourceTitles,
  linkDiscovery,
  excludedTitlePatterns,
}) {
  if (!linkDiscovery.enabled) {
    return [];
  }

  const sourceTitlePatterns = linkDiscovery.sourceTitlePatterns || [];
  const limitPerSource = linkDiscovery.limitPerSource || 100;
  const totalLimit = linkDiscovery.totalLimit || 1000;

  const linkSourceTitles = sourceTitles.filter((title) =>
    titleMatchesAnyPattern(title, sourceTitlePatterns),
  );

  const linkedTitles = [];

  console.log(`\nDiscovering links from ${linkSourceTitles.length} source pages`);

  for (const sourceTitle of linkSourceTitles) {
    if (linkedTitles.length >= totalLimit) {
      break;
    }

    try {
      const pageLinks = await fetchLinksFromPage(sourceTitle, limitPerSource);

      const filteredPageLinks = pageLinks.filter(
        (title) => !shouldExcludeTitle(title, excludedTitlePatterns),
      );

      for (const linkedTitle of filteredPageLinks) {
        if (linkedTitles.length >= totalLimit) {
          break;
        }

        linkedTitles.push(linkedTitle);
      }
    } catch (error) {
      console.warn(`Could not discover links from ${sourceTitle}`);

      if (error instanceof Error) {
        console.warn(error.message);
      }
    }
  }

  console.log(`Discovered ${linkedTitles.length} linked page references`);

  return linkedTitles;
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
    const namespaceMap = await fetchNamespaceMap();

    const discoveredTitles = [];

    for (const category of config.categories) {
      console.log(`\nDiscovering category: ${category.name}`);

      const categoryTitles = await fetchCategoryMembers(
        category.name,
        category.limit || 100,
      );

      const filteredCategoryTitles = categoryTitles.filter(
        (title) => !shouldExcludeTitle(title, config.excludedTitlePatterns),
      );

      console.log(`Found ${categoryTitles.length} pages`);
      console.log(`Kept ${filteredCategoryTitles.length} pages after filtering`);

      discoveredTitles.push(...filteredCategoryTitles);
    }

    for (const prefixConfig of config.prefixes) {
      const namespaceId = getNamespaceId(
        namespaceMap,
        prefixConfig.namespaceName ?? 0,
      );

      console.log(
        `\nDiscovering namespace: ${prefixConfig.namespaceName ?? "Main"} | prefix: "${prefixConfig.prefix ?? ""}"`,
      );

      const prefixTitles = await fetchPagesByPrefix({
        namespaceId,
        prefix: prefixConfig.prefix || "",
        limit: prefixConfig.limit || 100,
      });

      const filteredPrefixTitles = prefixTitles.filter(
        (title) => !shouldExcludeTitle(title, config.excludedTitlePatterns),
      );

      console.log(`Found ${prefixTitles.length} pages`);
      console.log(`Kept ${filteredPrefixTitles.length} pages after filtering`);

      discoveredTitles.push(...filteredPrefixTitles);
    }

    const filteredManualPages = config.manualPages.filter(
      (title) => !shouldExcludeTitle(title, config.excludedTitlePatterns),
    );

    const firstPassTitles = getUniqueSortedTitles([
      ...filteredManualPages,
      ...discoveredTitles,
    ]);

    const linkedTitles = await discoverLinkedPages({
      sourceTitles: firstPassTitles,
      linkDiscovery: config.linkDiscovery,
      excludedTitlePatterns: config.excludedTitlePatterns,
    });

    const allTitles = getUniqueSortedTitles([
      ...firstPassTitles,
      ...linkedTitles,
    ]);

    await writeFile(
      PAGE_TITLES_OUTPUT_PATH,
      JSON.stringify(allTitles, null, 2),
      "utf-8",
    );

    console.log("\nDiscovery complete.");
    console.log(`Manual pages: ${config.manualPages.length}`);
    console.log(`Manual pages kept: ${filteredManualPages.length}`);
    console.log(`Discovered category/prefix pages kept: ${discoveredTitles.length}`);
    console.log(`Linked page references kept: ${linkedTitles.length}`);
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