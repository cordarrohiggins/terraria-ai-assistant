import { buildWikiContext } from "@/lib/buildWikiContext";
import { generateAssistantAnswer } from "@/lib/generateAssistantAnswer";
import { getWikiChunkCount, searchWikiChunks } from "@/lib/searchWikiChunks";
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

  const wikiChunkCount = await getWikiChunkCount();

  if (wikiChunkCount === 0) {
    return NextResponse.json({
      role: "assistant",
      content:
        "I could not find the generated wiki chunk index yet. Run `node scripts/fetchWikiPage.mjs --from-list` and then `node scripts/buildWikiIndex.mjs` to generate local wiki data.",
      sources: [],
    });
  }

  const wikiResults = await searchWikiChunks(userMessage, 4);

  const topScore = wikiResults[0]?.score || 0;
  const minimumTopScore = 10;

  if (wikiResults.length === 0 || topScore < minimumTopScore) {
    return NextResponse.json({
      role: "assistant",
      content:
        "I could not find enough reliable Terraria wiki context to answer that yet. I would rather say I do not know than answer from weak or unrelated sources.",
      sources: [],
      debug: {
        chunkCount: wikiChunkCount,
        topScore,
        matchedChunks: wikiResults.map((result) => ({
          id: result.chunk.id,
          title: result.chunk.title,
          score: result.score,
        })),
      },
    });
  }

  const wikiContext = buildWikiContext(wikiResults, userMessage);

  const answer = await generateAssistantAnswer({
    userMessage,
    wikiResults,
    wikiContext,
  });

  const primarySource = wikiContext.sources[0];

  return NextResponse.json({
    role: "assistant",
    content: answer,
    matchedTitle: primarySource?.title,
    sourceUrl: primarySource?.url,
    sources: wikiContext.sources,
    debug: {
      chunkCount: wikiChunkCount,
      matchedChunks: wikiResults.map((result) => ({
        id: result.chunk.id,
        title: result.chunk.title,
        score: result.score,
      })),
    },
  });
}