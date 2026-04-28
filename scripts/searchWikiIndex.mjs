import { readFile } from "node:fs/promises";
import path from "node:path";

const WIKI_CHUNKS_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "wikiChunks.json",
);

const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error("Please provide a search query.");
  console.error('Example: node scripts/searchWikiIndex.mjs "How do I craft Night\'s Edge?"');
  process.exit(1);
}

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
  "make",
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

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImportantWords(text) {
  return normalizeText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !ignoredSearchWords.has(word));
}

function getUniqueWords(words) {
  return [...new Set(words)];
}

function isPreparationQuestion(normalizedQuery) {
  return (
    normalizedQuery.includes("prepare") ||
    normalizedQuery.includes("preparing") ||
    normalizedQuery.includes("strategy") ||
    normalizedQuery.includes("strategies") ||
    normalizedQuery.includes("beat") ||
    normalizedQuery.includes("fight")
  );
}

function isStrategyLikeTitle(normalizedTitle) {
  return (
    normalizedTitle.includes("guide") ||
    normalizedTitle.includes("strategy") ||
    normalizedTitle.includes("strategies")
  );
}

function scoreChunk(queryText, chunk) {
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

  const isAcquisitionQuestion =
    normalizedQuery.includes("get") ||
    normalizedQuery.includes("obtain") ||
    normalizedQuery.includes("craft") ||
    normalizedQuery.includes("make") ||
    normalizedQuery.includes("find") ||
    normalizedQuery.includes("buy") ||
    normalizedQuery.includes("drop") ||
    normalizedQuery.includes("where");

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
    const matches = normalizedChunkText.match(new RegExp(`\\b${topicWord}\\b`, "g"));

    return total + (matches?.length || 0);
  }, 0);

  const topicMatchesTitle = topicWords.some((topicWord) =>
    normalizedTitle.includes(topicWord),
  );

  let acquisitionWordMatches = 0;

  if (isAcquisitionQuestion) {
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
    score -= isAcquisitionQuestion ? 30 : 12;
  }

  if (looksLikeInternalData) {
    score -= 30;
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
  const fileContents = await readFile(WIKI_CHUNKS_PATH, "utf-8");
  return JSON.parse(fileContents);
}

function splitTextIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\s+-\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function scoreSentence(queryText, sentence) {
  const queryWords = getUniqueWords(getImportantWords(queryText));
  const normalizedSentence = normalizeText(sentence);

  let score = 0;

  for (const queryWord of queryWords) {
    if (normalizedSentence.includes(queryWord)) {
      score += 1;
    }
  }

  return score;
}

function getPreviewText(text, maxLength = 500) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function getRelevantPreviewText(queryText, text, maxLength = 500) {
  const sentences = splitTextIntoSentences(text);

  const relevantSentences = sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentence(queryText, sentence),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((result) => result.sentence);

  if (relevantSentences.length === 0) {
    return getPreviewText(text, maxLength);
  }

  return getPreviewText(relevantSentences.join(" "), maxLength);
}

async function main() {
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

  const isAcquisitionSearch =
    normalizedQuery.includes("get") ||
    normalizedQuery.includes("obtain") ||
    normalizedQuery.includes("craft") ||
    normalizedQuery.includes("make") ||
    normalizedQuery.includes("find") ||
    normalizedQuery.includes("buy") ||
    normalizedQuery.includes("drop") ||
    normalizedQuery.includes("where");

  const minimumScore = isAcquisitionSearch
    ? Math.max(8, topScore * 0.5)
    : Math.max(8, topScore * 0.35);

  const filteredResults = scoredResults.filter(
    (result) => result.score >= minimumScore,
  );

  const topSourceUrl = filteredResults[0]?.chunk.sourceUrl;
  const sourceCounts = new Map();
  const selectedChunkIds = new Set();
  const selectedResults = [];

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

    if (selectedResults.length >= 5) {
      break;
    }
  }

  const results = selectedResults;

  console.log(`Search query: ${query}`);
  console.log(`Chunks searched: ${chunks.length}`);

  if (results.length === 0) {
    console.log("\nNo matching chunks found.");
    return;
  }

  console.log("\nTop matches:");

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.chunk.title}`);
    console.log(`Chunk ID: ${result.chunk.id}`);
    console.log(`Score: ${result.score}`);
    console.log(`Source: ${result.chunk.sourceUrl}`);
    console.log("Text preview:");
    console.log(getRelevantPreviewText(query, result.chunk.text));
  });
}

main().catch((error) => {
  console.error("Failed to search wiki index.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});