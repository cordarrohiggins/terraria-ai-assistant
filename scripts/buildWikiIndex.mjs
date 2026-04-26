import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const WIKI_OUTPUT_DIRECTORY = path.join(process.cwd(), "wiki-output");
const GENERATED_DATA_DIRECTORY = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
);
const WIKI_CHUNKS_OUTPUT_PATH = path.join(
  GENERATED_DATA_DIRECTORY,
  "wikiChunks.json",
);

const MAX_WORDS_PER_CHUNK = 180;
const OVERLAP_WORDS = 35;
const MIN_WORDS_PER_CHUNK = 20;

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(text) {
  return normalizeWhitespace(text).split(/\s+/).filter(Boolean).length;
}

function createChunkId(title, chunkIndex) {
  return `${title
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${chunkIndex}`;
}

function splitTextIntoSentences(text) {
  const normalizedText = normalizeWhitespace(text);

  const sentenceMatches = normalizedText.match(
    /[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g,
  );

  if (!sentenceMatches) {
    return [];
  }

  return sentenceMatches.map((sentence) => sentence.trim()).filter(Boolean);
}

function splitLongSentence(sentence) {
  const words = sentence.split(/\s+/).filter(Boolean);
  const parts = [];

  for (
    let startIndex = 0;
    startIndex < words.length;
    startIndex += MAX_WORDS_PER_CHUNK
  ) {
    const partWords = words.slice(startIndex, startIndex + MAX_WORDS_PER_CHUNK);
    parts.push(partWords.join(" "));
  }

  return parts;
}

function getOverlapSentences(sentences) {
  const overlapSentences = [];
  let totalWords = 0;

  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    const sentence = sentences[index];
    const sentenceWordCount = countWords(sentence);

    if (
      totalWords + sentenceWordCount > OVERLAP_WORDS &&
      overlapSentences.length > 0
    ) {
      break;
    }

    overlapSentences.unshift(sentence);
    totalWords += sentenceWordCount;

    if (totalWords >= OVERLAP_WORDS) {
      break;
    }
  }

  return overlapSentences;
}

function chunkTextBySentences(text) {
  const sentences = splitTextIntoSentences(text);
  const chunks = [];

  let currentSentences = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWordCount = countWords(sentence);

    if (sentenceWordCount > MAX_WORDS_PER_CHUNK) {
      if (currentSentences.length > 0) {
        chunks.push(currentSentences.join(" "));
        currentSentences = getOverlapSentences(currentSentences);
        currentWordCount = countWords(currentSentences.join(" "));
      }

      const sentenceParts = splitLongSentence(sentence);

      for (const part of sentenceParts) {
        chunks.push(part);
      }

      currentSentences = [];
      currentWordCount = 0;
      continue;
    }

    if (
      currentSentences.length > 0 &&
      currentWordCount + sentenceWordCount > MAX_WORDS_PER_CHUNK
    ) {
      chunks.push(currentSentences.join(" "));

      currentSentences = getOverlapSentences(currentSentences);
      currentWordCount = countWords(currentSentences.join(" "));
    }

    currentSentences.push(sentence);
    currentWordCount += sentenceWordCount;
  }

  if (currentSentences.length > 0) {
    chunks.push(currentSentences.join(" "));
  }

  return chunks;
}

function isLikelyNavigationList(text) {
  const dashSeparatorCount = (text.match(/\s-\s/g) || []).length;
  const wordCount = countWords(text);
  const sentenceCount = splitTextIntoSentences(text).length;

  if (dashSeparatorCount >= 8) {
    return true;
  }

  if (dashSeparatorCount >= 5 && sentenceCount <= 2) {
    return true;
  }

  if (wordCount > 0 && dashSeparatorCount / wordCount > 0.08) {
    return true;
  }

  return false;
}

function isMostlySymbolsOrShortList(text) {
  const wordCount = countWords(text);
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const symbolCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;

  return wordCount < MIN_WORDS_PER_CHUNK || symbolCount > letterCount;
}

function isLikelyStatTableChunk(text) {
  const lines = normalizeWhitespace(text)
    .split(/\n|(?<=%)\s+|(?<=\*)\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const wordCount = countWords(text);
  const numberCount = (text.match(/\b\d+(\.\d+)?%?\*?\b/g) || []).length;
  const percentCount = (text.match(/\d+%/g) || []).length;
  const internalIdCount = (text.match(/internal item id/gi) || []).length;
  const developerItemCount = (text.match(/developer item/gi) || []).length;

  if (internalIdCount >= 2) {
    return true;
  }

  if (developerItemCount >= 2) {
    return true;
  }

  if (percentCount >= 5) {
    return true;
  }

  if (wordCount > 0 && numberCount / wordCount > 0.25) {
    return true;
  }

  const shortLineCount = lines.filter((line) => line.length <= 12).length;

  if (lines.length >= 8 && shortLineCount / lines.length > 0.5) {
    return true;
  }

  return false;
}

function isUsefulChunk(text) {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText) {
    return false;
  }

  if (isMostlySymbolsOrShortList(normalizedText)) {
    return false;
  }

  if (isLikelyNavigationList(normalizedText)) {
    return false;
  }

  if (isLikelyStatTableChunk(normalizedText)) {
    return false;
  }

  return true;
}

function chunkWikiPage(wikiPage) {
  const textChunks = chunkTextBySentences(wikiPage.extract).filter(isUsefulChunk);

  return textChunks.map((text, index) => ({
    id: createChunkId(wikiPage.title, index),
    title: wikiPage.title,
    pageId: wikiPage.pageId,
    sourceUrl: wikiPage.sourceUrl,
    chunkIndex: index,
    text,
  }));
}

async function readWikiPages() {
  const fileNames = await readdir(WIKI_OUTPUT_DIRECTORY);
  const jsonFileNames = fileNames.filter((fileName) =>
    fileName.endsWith(".json"),
  );

  const wikiPages = [];

  for (const fileName of jsonFileNames) {
    const filePath = path.join(WIKI_OUTPUT_DIRECTORY, fileName);
    const fileContents = await readFile(filePath, "utf-8");
    const wikiPage = JSON.parse(fileContents);

    if (!wikiPage.title || !wikiPage.extract || !wikiPage.sourceUrl) {
      console.warn(`Skipping invalid wiki page file: ${fileName}`);
      continue;
    }

    wikiPages.push(wikiPage);
  }

  return wikiPages;
}

async function main() {
  const wikiPages = await readWikiPages();

  if (wikiPages.length === 0) {
    console.error("No wiki pages found. Run the fetch script first.");
    console.error("Example: node scripts/fetchWikiPage.mjs --from-list");
    process.exit(1);
  }

  const chunks = wikiPages.flatMap((wikiPage) => chunkWikiPage(wikiPage));

  await mkdir(GENERATED_DATA_DIRECTORY, { recursive: true });
  await writeFile(
    WIKI_CHUNKS_OUTPUT_PATH,
    JSON.stringify(chunks, null, 2),
    "utf-8",
  );

  console.log("Wiki index built.");
  console.log(`Pages processed: ${wikiPages.length}`);
  console.log(`Chunks created: ${chunks.length}`);
  console.log(`Saved to: ${WIKI_CHUNKS_OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Failed to build wiki index.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});