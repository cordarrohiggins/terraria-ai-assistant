import type { WikiContext } from "@/lib/buildWikiContext";
import type { WikiChunkSearchResult } from "@/lib/searchWikiChunks";

type GenerateAssistantAnswerInput = {
  userMessage: string;
  wikiResults: WikiChunkSearchResult[];
  wikiContext: WikiContext;
};

function createPreviewText(text: string, maxLength = 700) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function getQuestionTopic(userMessage: string) {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("wing")) {
    return "wings";
  }

  if (lowerMessage.includes("night") && lowerMessage.includes("edge")) {
    return "Night's Edge";
  }

  if (lowerMessage.includes("goblin")) {
    return "the Goblin Tinkerer";
  }

  if (lowerMessage.includes("hardmode")) {
    return "Hardmode";
  }

  if (lowerMessage.includes("wall of flesh")) {
    return "the Wall of Flesh";
  }

  return "that topic";
}

export async function generateAssistantAnswer({
  userMessage,
  wikiResults,
  wikiContext,
}: GenerateAssistantAnswerInput) {
  const primaryResult = wikiResults[0];
  const primaryChunk = primaryResult.chunk;
  const topic = getQuestionTopic(userMessage);

  const relatedSources = wikiContext.sources
    .filter((source) => source.title !== primaryChunk.title)
    .map((source) => source.title);

  const relatedText =
    relatedSources.length > 0
      ? ` I also found related wiki context from ${relatedSources.join(", ")}.`
      : "";

  return [
    `I found Terraria wiki information related to ${topic}.`,
    "",
    createPreviewText(primaryChunk.text),
    "",
    `Source: ${primaryChunk.title}.${relatedText}`,
    "",
    "This is still a retrieval-based draft answer. The next step will be replacing this fallback with an actual AI model that rewrites the retrieved wiki context into a clearer response.",
  ].join("\n");
}