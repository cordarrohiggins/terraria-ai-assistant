import { buildWikiContext } from "@/lib/buildWikiContext";
import { getWikiChunkCount, searchWikiChunks } from "@/lib/searchWikiChunks";
import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
};

function createPreviewText(text: string, maxLength = 700) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

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
  const primaryResult = wikiResults[0];
  const primaryChunk = primaryResult.chunk;

  return NextResponse.json({
    role: "assistant",
    content: [
      `I found relevant Terraria wiki information from ${primaryChunk.title}.`,
      "",
      "This is still retrieval-only. The next major step is adding an AI layer that turns this wiki context into a clean answer.",
      "",
      createPreviewText(primaryChunk.text),
    ].join("\n"),
    matchedTitle: primaryChunk.title,
    sourceUrl: primaryChunk.sourceUrl,
    sources: wikiContext.sources,
    debug: {
      chunkCount: wikiChunkCount,
      fullContext: wikiContext.contextText,
      matchedChunks: wikiResults.map((result) => ({
        id: result.chunk.id,
        title: result.chunk.title,
        score: result.score,
      })),
    },
  });
}