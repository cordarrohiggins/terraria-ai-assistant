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
  "prepare",
  "preparing",
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
      score += 8;
    }

    if (titleWords.includes(queryWord)) {
      score += 6;
    }

    if (normalizedChunkText.includes(queryWord)) {
      score += 2;
    }
  }

  const exactPhraseBonus = normalizedChunkText.includes(normalizedQuery) ? 12 : 0;
  score += exactPhraseBonus;

  return score;
}

async function loadWikiChunks() {
  const fileContents = await readFile(WIKI_CHUNKS_PATH, "utf-8");
  return JSON.parse(fileContents);
}

function getPreviewText(text, maxLength = 500) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

async function main() {
  const chunks = await loadWikiChunks();

  const results = chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(query, chunk),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
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
    console.log(getPreviewText(result.chunk.text));
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