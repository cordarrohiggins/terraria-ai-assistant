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

  const wikiResults = await searchWikiChunks(userMessage, 3);

  if (wikiResults.length === 0) {
    return NextResponse.json({
      role: "assistant",
      content:
        "I searched the local Terraria wiki index, but I could not find a strong match for that question yet. This may improve as more wiki pages are added to the page list.",
      sources: [],
    });
  }

  const wikiContext = buildWikiContext(wikiResults);
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