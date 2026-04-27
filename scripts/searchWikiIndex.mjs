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
  "defeated",
  "entering",
  "fighting",
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

  if (
    normalizedChunkText.includes("the jungle grows restless") ||
    normalizedChunkText.includes("defeating each of the three mechanical bosses")
  ) {
    score += 12;
  }

  if (
    normalizedChunkText.includes("achievement") ||
    normalizedChunkText.includes("category challenger") ||
    normalizedChunkText.includes("slayer of worlds") ||
    normalizedChunkText.includes("desktop console and mobile versions")
  ) {
    score -= 10;
  }

  const isPreparationQuestion =
    normalizedQuery.includes("prepare") ||
    normalizedQuery.includes("preparing") ||
    normalizedQuery.includes("strategy") ||
    normalizedQuery.includes("strategies") ||
    normalizedQuery.includes("beat") ||
    normalizedQuery.includes("fight");

  const isStrategyPage =
    normalizedTitle.includes("guide") ||
    normalizedTitle.includes("strategies") ||
    normalizedTitle.includes("strategy");

  const hasTopicMatchInTitle = queryWords.some((queryWord) =>
    normalizedTitle.includes(queryWord),
  );

  if (isPreparationQuestion && isStrategyPage && hasTopicMatchInTitle) {
    score += 20;
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

  if (normalizedSentence.includes("defeating each of the three mechanical bosses")) {
    score += 5;
  }

  if (normalizedSentence.includes("the jungle grows restless")) {
    score += 5;
  }

  if (normalizedSentence.includes("plantera")) {
    score += 2;
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

  const bestResultBySource = new Map();

  for (const result of scoredResults) {
    const sourceKey = result.chunk.sourceUrl;

    if (!bestResultBySource.has(sourceKey)) {
      bestResultBySource.set(sourceKey, result);
    }
  }

  const topScore = scoredResults[0]?.score || 0;
  const minimumScore = Math.max(20, topScore * 0.4);

  const results = [...bestResultBySource.values()]
    .filter((result) => result.score >= minimumScore)
    .slice(0, 5);

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