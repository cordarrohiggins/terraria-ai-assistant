import {
  findBestKnowledgeMatch,
  getAvailableKnowledgeTopics,
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

  const knowledgeResult = findBestKnowledgeMatch(userMessage);

  if (!knowledgeResult) {
    const availableTopics = getAvailableKnowledgeTopics();

    return NextResponse.json({
      role: "assistant",
      content: `I do not have a local wiki entry for that question yet. Try asking about one of these topics: ${availableTopics.join(", ")}.`,
    });
  }

  const knowledgeMatch = knowledgeResult.entry;

  return NextResponse.json({
    role: "assistant",
    content: knowledgeMatch.summary,
    matchedTitle: knowledgeMatch.title,
    sourceUrl: knowledgeMatch.sourceUrl,
    matchScore: knowledgeResult.score,
  });
}