import type { WikiContext } from "@/lib/buildWikiContext";
import { generateWithOllama } from "@/lib/ollamaClient";
import type { WikiChunkSearchResult } from "@/lib/searchWikiChunks";

type GenerateAssistantAnswerInput = {
  userMessage: string;
  wikiResults: WikiChunkSearchResult[];
  wikiContext: WikiContext;
};

function createFallbackAnswer({
  wikiResults,
  wikiContext,
}: GenerateAssistantAnswerInput) {
  const primaryResult = wikiResults[0];
  const primaryChunk = primaryResult.chunk;

  return [
    `I found Terraria wiki information from ${primaryChunk.title}, but I could not generate a polished AI answer right now.`,
    "",
    primaryChunk.text.slice(0, 700).trim(),
    "",
    `Source: ${primaryChunk.title}`,
    "",
    "This fallback response means the local wiki retrieval worked, but the local AI model may not have responded successfully.",
  ].join("\n");
}

function buildPrompt({
  userMessage,
  wikiContext,
}: GenerateAssistantAnswerInput) {
  return `
You are a helpful Terraria guide.

Answer the user's question using only the Terraria wiki context provided below.

Rules:
- Do not make up facts that are not supported by the context.
- If the context does not contain enough information, say what is missing.
- Keep the answer clear and beginner-friendly.
- Do not dump raw wiki text.
- Do not mention that you are using an AI model.
- Do not include fake citations.
- End with a short "Sources used" line listing the wiki page titles used.

User question:
${userMessage}

Terraria wiki context:
${wikiContext.contextText}

Answer:
`.trim();
}

export async function generateAssistantAnswer(input: GenerateAssistantAnswerInput) {
  const prompt = buildPrompt(input);

  try {
    const answer = await generateWithOllama({
      prompt,
    });

    if (!answer) {
      return createFallbackAnswer(input);
    }

    return answer;
  } catch (error) {
    console.error("Ollama answer generation failed:", error);

    return createFallbackAnswer(input);
  }
}