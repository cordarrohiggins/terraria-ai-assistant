import {
  findKnowledgeMatches,
  getAvailableKnowledgeTopics,
  getKnowledgeEntriesByIds,
} from "@/lib/searchTerrariaKnowledge";
import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;

  const userMessage = body.message?.trim();

  if (!userMessage) {
    return NextResponse.json(
      {
        error: "Message is required.",
      },
      {
        status: 400,
      },
    );
  }

  const knowledgeResults = findKnowledgeMatches(userMessage, 3);

  if (knowledgeResults.length === 0) {
    const availableTopics = getAvailableKnowledgeTopics();

    return NextResponse.json({
      role: "assistant",
      content: `I do not have a local wiki entry for that question yet. Try asking about one of these topics: ${availableTopics.join(", ")}.`,
    });
  }

  const primaryMatch = knowledgeResults[0].entry;

  const strongSearchMatches = knowledgeResults
    .slice(1)
    .filter((result) => result.score >= 3)
    .map((result) => result.entry);

  const intentionalRelatedMatches = getKnowledgeEntriesByIds(
    primaryMatch.relatedEntryIds || [],
  );

  const relatedMatches = [
    ...strongSearchMatches,
    ...intentionalRelatedMatches,
  ].filter(
    (entry, index, entries) =>
      entry.id !== primaryMatch.id &&
      entries.findIndex((currentEntry) => currentEntry.id === entry.id) === index,
  );

  const relatedText =
    relatedMatches.length > 0
      ? `\n\nRelated local topics that may also help: ${relatedMatches
          .map((entry) => entry.title)
          .join(", ")}.`
      : "";

  const sources = [primaryMatch, ...relatedMatches];

  return NextResponse.json({
    role: "assistant",
    content: `${primaryMatch.summary}${relatedText}`,
    matchedTitle: primaryMatch.title,
    sourceUrl: primaryMatch.sourceUrl,
    sources: sources.map((entry) => ({
      title: entry.title,
      url: entry.sourceUrl,
    })),
    matchScore: knowledgeResults[0].score,
  });
}