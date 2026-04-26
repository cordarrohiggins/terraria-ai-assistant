import {
  terrariaKnowledge,
  type TerrariaKnowledgeEntry,
} from "@/data/terrariaKnowledge";

export type TerrariaKnowledgeSearchResult = {
  entry: TerrariaKnowledgeEntry;
  score: number;
};

export function findBestKnowledgeMatch(
  userMessage: string,
): TerrariaKnowledgeSearchResult | null {
  const normalizedMessage = userMessage.toLowerCase();

  let bestResult: TerrariaKnowledgeSearchResult | null = null;

  for (const entry of terrariaKnowledge) {
    let score = 0;

    if (normalizedMessage.includes(entry.title.toLowerCase())) {
      score += 5;
    }

    for (const keyword of entry.keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        score += 3;
      }
    }

    const titleWords = entry.title.toLowerCase().split(" ");

    for (const word of titleWords) {
      if (word.length > 3 && normalizedMessage.includes(word)) {
        score += 1;
      }
    }

    if (!bestResult || score > bestResult.score) {
      bestResult = {
        entry,
        score,
      };
    }
  }

  if (!bestResult || bestResult.score === 0) {
    return null;
  }

  return bestResult;
}

export function getAvailableKnowledgeTopics() {
  return terrariaKnowledge.map((entry) => entry.title);
}