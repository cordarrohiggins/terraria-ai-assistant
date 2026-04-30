import type { WikiChunkSearchResult } from "@/lib/searchWikiChunks";

export type WikiSource = {
  title: string;
  url: string;
};

export type WikiContext = {
  contextText: string;
  sources: WikiSource[];
};

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

function splitTextIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\s+-\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function scoreSentence(userMessage: string, sentence: string) {
  const queryWords = getUniqueWords(getImportantWords(userMessage));
  const normalizedSentence = normalizeText(sentence);

  let score = 0;

  for (const queryWord of queryWords) {
    if (normalizedSentence.includes(queryWord)) {
      score += 1;
    }
  }

  const normalizedUserMessage = normalizeText(userMessage);

  const isAcquisitionQuestion =
    normalizedUserMessage.includes("get") ||
    normalizedUserMessage.includes("obtain") ||
    normalizedUserMessage.includes("craft") ||
    normalizedUserMessage.includes("make") ||
    normalizedUserMessage.includes("find") ||
    normalizedUserMessage.includes("buy") ||
    normalizedUserMessage.includes("drop") ||
    normalizedUserMessage.includes("where");

  const userAskedForConversionMethod =
    normalizedUserMessage.includes("shimmer") ||
    normalizedUserMessage.includes("decraft") ||
    normalizedUserMessage.includes("recycle") ||
    normalizedUserMessage.includes("convert") ||
    normalizedUserMessage.includes("replace");

  const looksLikeConversionMethod =
    normalizedSentence.includes("shimmer") ||
    normalizedSentence.includes("decraft") ||
    normalizedSentence.includes("recycle") ||
    normalizedSentence.includes("convert");

  if (
    isAcquisitionQuestion &&
    !userAskedForConversionMethod &&
    looksLikeConversionMethod
  ) {
    score -= 5;
  }

  return score;
}

function getFocusedSnippet(userMessage: string, text: string) {
  const sentences = splitTextIntoSentences(text);

  const focusedSentences = sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentence(userMessage, sentence),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((result) => result.sentence);

  if (focusedSentences.length === 0) {
    return text.slice(0, 900).trim();
  }

  return focusedSentences.join(" ");
}

export function buildWikiContext(
  results: WikiChunkSearchResult[],
  userMessage: string,
): WikiContext {
  const contextText = results
    .map((result, index) => {
      return [
        `Source ${index + 1}: ${result.chunk.title}`,
        `URL: ${result.chunk.sourceUrl}`,
        "Relevant text:",
        getFocusedSnippet(userMessage, result.chunk.text),
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const sources = [
    ...new Map(
      results.map((result) => [
        result.chunk.sourceUrl,
        {
          title: result.chunk.title,
          url: result.chunk.sourceUrl,
        },
      ]),
    ).values(),
  ];

  return {
    contextText,
    sources,
  };
}