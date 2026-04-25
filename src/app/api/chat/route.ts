import { findBestKnowledgeMatch } from "@/lib/searchTerrariaKnowledge";
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
    return NextResponse.json({
      role: "assistant",
      content:
        "I do not have a local wiki entry for that question yet. Right now, I only know a few starter topics like Eye of Cthulhu progression, Night's Edge crafting, Skeletron preparation, Hardmode preparation, and the Guide NPC.",
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