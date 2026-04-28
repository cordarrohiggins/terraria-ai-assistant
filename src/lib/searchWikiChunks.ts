import { readFile } from "node:fs/promises";
import path from "node:path";

export type WikiChunk = {
  id: string;
  title: string;
  pageId: number;
  sourceUrl: string;
  chunkIndex: number;
  text: string;
};

export type WikiChunkSearchResult = {
  chunk: WikiChunk;
  score: number;
};

const WIKI_CHUNKS_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "wikiChunks.json",
);

const ignoredSearchWords = new Set([
  "about",
  "after",
  "also",
  "before",
  "bring",
  "could",
  "from",
  "have",
  "how",
  "into",
  "many",
  "much",
  "often",
  "players",
  "should",
  "that",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

let cachedWikiChunks: WikiChunk[] | null = null;

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImportantWords(text: string) {
  return normalizeText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !ignoredSearchWords.has(word));
}

function getUniqueWords(words: string[]) {
  return [...new Set(words)];
}

function isPreparationQuestion(normalizedQuery: string) {
  return (
    normalizedQuery.includes("prepare") ||
    normalizedQuery.includes("preparing") ||
    normalizedQuery.includes("strategy") ||
    normalizedQuery.includes("strategies") ||
    normalizedQuery.includes("beat") ||
    normalizedQuery.includes("fight")
  );
}

function isAcquisitionQuestion(normalizedQuery: string) {
  return (
    normalizedQuery.includes("get") ||
    normalizedQuery.includes("obtain") ||
    normalizedQuery.includes("craft") ||
    normalizedQuery.includes("make") ||
    normalizedQuery.includes("find") ||
    normalizedQuery.includes("buy") ||
    normalizedQuery.includes("drop") ||
    normalizedQuery.includes("where")
  );
}

function isStrategyLikeTitle(normalizedTitle: string) {
  return (
    normalizedTitle.includes("guide") ||
    normalizedTitle.includes("strategy") ||
    normalizedTitle.includes("strategies")
  );
}

function scoreChunk(queryText: string, chunk: WikiChunk) {
  const normalizedQuery = normalizeText(queryText);
  const normalizedTitle = normalizeText(chunk.title);
  const normalizedChunkText = normalizeText(chunk.text);

  const queryWords = getUniqueWords(getImportantWords(queryText));
  const titleWords = getImportantWords(chunk.title);

  let score = 0;

  if (normalizedQuery.includes(normalizedTitle)) {
    score += 20;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    score += 20;
  }

  for (const queryWord of queryWords) {
    if (normalizedTitle.includes(queryWord)) {
      score += 6;
    }

    if (titleWords.includes(queryWord)) {
      score += 4;
    }

    if (normalizedChunkText.includes(queryWord)) {
      score += 3;
    }
  }

  if (normalizedChunkText.includes(normalizedQuery)) {
    score += 12;
  }

  const hasTopicMatchInTitle = queryWords.some((queryWord) =>
    normalizedTitle.includes(queryWord),
  );

  if (
    isPreparationQuestion(normalizedQuery) &&
    isStrategyLikeTitle(normalizedTitle) &&
    hasTopicMatchInTitle
  ) {
    score += 20;
  }

  const acquisitionWords = [
    "obtained",
    "obtain",
    "crafted",
    "craft",
    "dropped",
    "drop",
    "bought",
    "buy",
    "sold",
    "found",
    "find",
    "loot",
    "chest",
    "enemy",
    "enemies",
    "requires",
    "require",
    "material",
    "materials",
    "farmed",
    "farm",
    "dropped by",
    "sold by",
  ];

  const acquisitionIntentWords = new Set([
    "get",
    "obtain",
    "craft",
    "make",
    "find",
    "buy",
    "drop",
    "where",
  ]);

  const topicWords = queryWords.filter(
    (queryWord) => !acquisitionIntentWords.has(queryWord),
  );

  const topicMentionsInChunk = topicWords.reduce((total, topicWord) => {
    const matches = normalizedChunkText.match(
      new RegExp(`\\b${topicWord}\\b`, "g"),
    );

    return total + (matches?.length || 0);
  }, 0);

  const topicMatchesTitle = topicWords.some((topicWord) =>
    normalizedTitle.includes(topicWord),
  );

  if (isAcquisitionQuestion(normalizedQuery)) {
    let acquisitionWordMatches = 0;

    for (const word of acquisitionWords) {
      if (normalizedChunkText.includes(word)) {
        acquisitionWordMatches += 1;
        score += 2;
      }
    }

    if (acquisitionWordMatches === 0) {
      score -= 18;
    }

    if (!topicMatchesTitle && topicMentionsInChunk < 2) {
      score -= 18;
    }
  }

  const looksLikeVersionHistory =
    normalizedChunkText.includes("introduced") ||
    normalizedChunkText.includes("version") ||
    normalizedChunkText.includes("release") ||
    normalizedChunkText.includes("desktop release") ||
    normalizedChunkText.includes("console release") ||
    normalizedChunkText.includes("3ds release") ||
    normalizedChunkText.includes("old gen") ||
    normalizedChunkText.includes("now require") ||
    normalizedChunkText.includes("now requires") ||
    normalizedChunkText.includes("changed from") ||
    normalizedChunkText.includes("changed to");

  const looksLikeInternalData =
    normalizedChunkText.includes("initializer") ||
    normalizedChunkText.includes("internal item id") ||
    normalizedChunkText.includes("internal npc id") ||
    normalizedChunkText.includes("internal projectile id");

  if (looksLikeVersionHistory) {
    score -= isAcquisitionQuestion(normalizedQuery) ? 30 : 12;
  }

  if (looksLikeInternalData) {
    score -= 30;
  }

  if (
    normalizedChunkText.includes("achievement") ||
    normalizedChunkText.includes("category challenger") ||
    normalizedChunkText.includes("desktop console and mobile versions")
  ) {
    score -= 8;
  }

  return Math.max(score, 0);
}

async function loadWikiChunks() {
  if (cachedWikiChunks) {
    return cachedWikiChunks;
  }

  try {
    const fileContents = await readFile(WIKI_CHUNKS_PATH, "utf-8");
    const chunks = JSON.parse(fileContents) as WikiChunk[];

    cachedWikiChunks = chunks;

    return chunks;
  } catch {
    cachedWikiChunks = [];

    return [];
  }
}

export async function searchWikiChunks(query: string, limit = 4) {
  const chunks = await loadWikiChunks();

  const scoredResults = chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(query, chunk),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);

  const topScore = scoredResults[0]?.score || 0;
  const normalizedQuery = normalizeText(query);

  const minimumScore = isAcquisitionQuestion(normalizedQuery)
    ? Math.max(8, topScore * 0.5)
    : Math.max(8, topScore * 0.35);

  const filteredResults = scoredResults.filter(
    (result) => result.score >= minimumScore,
  );

  const topSourceUrl = filteredResults[0]?.chunk.sourceUrl;
  const sourceCounts = new Map<string, number>();
  const selectedChunkIds = new Set<string>();
  const selectedResults: WikiChunkSearchResult[] = [];

  for (const result of filteredResults) {
    const sourceKey = result.chunk.sourceUrl;
    const chunkId = result.chunk.id;

    if (selectedChunkIds.has(chunkId)) {
      continue;
    }

    const currentSourceCount = sourceCounts.get(sourceKey) || 0;
    const maxChunksForSource = sourceKey === topSourceUrl ? 3 : 1;

    if (currentSourceCount >= maxChunksForSource) {
      continue;
    }

    selectedResults.push(result);
    selectedChunkIds.add(chunkId);
    sourceCounts.set(sourceKey, currentSourceCount + 1);

    if (selectedResults.length >= limit) {
      break;
    }
  }

  return selectedResults;
}

export async function getWikiChunkCount() {
  const chunks = await loadWikiChunks();

  return chunks.length;
}