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
      score += 8;
    }

    if (titleWords.includes(queryWord)) {
      score += 6;
    }

    if (normalizedChunkText.includes(queryWord)) {
      score += 2;
    }
  }

  if (normalizedChunkText.includes(normalizedQuery)) {
    score += 12;
  }

  return score;
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

export async function searchWikiChunks(query: string, limit = 3) {
  const chunks = await loadWikiChunks();

  return chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(query, chunk),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getWikiChunkCount() {
  const chunks = await loadWikiChunks();

  return chunks.length;
}