import { buildWikiContext } from "@/lib/buildWikiContext";
import { generateAssistantAnswer } from "@/lib/generateAssistantAnswer";
import { getWikiChunkCount, searchWikiChunks } from "@/lib/searchWikiChunks";
import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
};

type TopicRequirement = {
  triggers: string[];
  requiredSourceTitles: string[];
  label: string;
};

const topicRequirements: TopicRequirement[] = [
  {
    triggers: [
      "mechanical boss",
      "mechanical bosses",
      "mech boss",
      "mech bosses",
      "destroyer",
      "the twins",
      "skeletron prime",
    ],
    requiredSourceTitles: [
      "Mechanical bosses",
      "The Destroyer",
      "The Twins",
      "Skeletron Prime",
    ],
    label: "mechanical bosses",
  },
  {
    triggers: ["plantera"],
    requiredSourceTitles: ["Plantera"],
    label: "Plantera",
  },
  {
    triggers: ["golem"],
    requiredSourceTitles: ["Golem"],
    label: "Golem",
  },
  {
    triggers: ["moon lord"],
    requiredSourceTitles: ["Moon Lord"],
    label: "Moon Lord",
  },
];

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function checkTopicCoverage(
  userMessage: string,
  sourceTitles: string[],
): { hasCoverage: true } | { hasCoverage: false; missingTopic: string } {
  const normalizedMessage = normalizeText(userMessage);
  const normalizedSourceTitles = sourceTitles.map(normalizeText);

  for (const requirement of topicRequirements) {
    const wasTriggered = requirement.triggers.some((trigger) =>
      normalizedMessage.includes(normalizeText(trigger)),
    );

    if (!wasTriggered) {
      continue;
    }

    const hasRequiredSource = requirement.requiredSourceTitles.some((requiredTitle) =>
      normalizedSourceTitles.includes(normalizeText(requiredTitle)),
    );

    if (!hasRequiredSource) {
      return {
        hasCoverage: false,
        missingTopic: requirement.label,
      };
    }
  }

  return {
    hasCoverage: true,
  };
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

  const minimumTopScore = 10;
  const topScore = wikiResults[0]?.score || 0;

  if (wikiResults.length === 0 || topScore < minimumTopScore) {
    return NextResponse.json({
      role: "assistant",
      content:
        "I do not have enough reliable Terraria wiki context to answer that yet. I would rather say I do not know than give you an answer from weak or unrelated sources. This should improve once more wiki pages are added to the local index.",
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

  const sourceTitles = wikiResults.map((result) => result.chunk.title);
  const topicCoverage = checkTopicCoverage(userMessage, sourceTitles);

  if (!topicCoverage.hasCoverage) {
    return NextResponse.json({
      role: "assistant",
      content: `I found some related Terraria wiki text, but I do not have the right indexed wiki pages to answer about ${topicCoverage.missingTopic} reliably yet. I should not answer from unrelated sources. Add the relevant wiki pages to the local page list, then re-fetch and rebuild the index.`,
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