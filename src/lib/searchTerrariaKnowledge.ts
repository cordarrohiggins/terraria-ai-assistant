import {
  terrariaKnowledge,
  type TerrariaKnowledgeEntry,
} from "@/data/terrariaKnowledge";

export type TerrariaKnowledgeSearchResult = {
  entry: TerrariaKnowledgeEntry;
  score: number;
};

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
  "often",
  "players",
  "prepare",
  "preparing",
  "should",
  "stronger",
  "that",
  "this",
  "usually",
  "useful",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, " ");
}

function getImportantWords(text: string) {
  return normalizeText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 3)
    .filter((word) => !ignoredSearchWords.has(word));
}

function scoreKnowledgeEntry(
  normalizedMessage: string,
  importantUserWords: string[],
  entry: TerrariaKnowledgeEntry,
) {
  let score = 0;

  const normalizedTitle = normalizeText(entry.title);
  const normalizedSummary = normalizeText(entry.summary);
  const normalizedCategory = normalizeText(entry.category);

  if (normalizedMessage.includes(normalizedTitle)) {
    score += 5;
  }

  if (normalizedMessage.includes(normalizedCategory)) {
    score += 1;
  }

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (normalizedMessage.includes(normalizedKeyword)) {
      score += 3;
    }

    const keywordWords = getImportantWords(keyword);

    for (const keywordWord of keywordWords) {
      if (importantUserWords.includes(keywordWord)) {
        score += 1;
      }
    }
  }

  const titleWords = getImportantWords(entry.title);

  for (const word of titleWords) {
    if (importantUserWords.includes(word)) {
      score += 1;
    }
  }

  const summaryWords = getImportantWords(entry.summary);

  for (const word of importantUserWords) {
    if (summaryWords.includes(word)) {
      score += 0.5;
    }
  }

  return score;
}

export function findKnowledgeMatches(
  userMessage: string,
  limit = 3,
): TerrariaKnowledgeSearchResult[] {
  const normalizedMessage = normalizeText(userMessage);
  const importantUserWords = getImportantWords(userMessage);

  return terrariaKnowledge
    .map((entry) => ({
      entry,
      score: scoreKnowledgeEntry(normalizedMessage, importantUserWords, entry),
    }))
    .filter((result) => result.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findBestKnowledgeMatch(
  userMessage: string,
): TerrariaKnowledgeSearchResult | null {
  const matches = findKnowledgeMatches(userMessage, 1);

  return matches[0] || null;
}

export function getAvailableKnowledgeTopics() {
  return terrariaKnowledge.map((entry) => entry.title);
}

export function getKnowledgeEntriesByIds(entryIds: string[]) {
  return entryIds
    .map((entryId) => terrariaKnowledge.find((entry) => entry.id === entryId))
    .filter((entry): entry is TerrariaKnowledgeEntry => Boolean(entry));
}