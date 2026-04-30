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
You are a careful Terraria guide.

Answer the user's question using only the Terraria wiki context provided below.

Grounding rules:
- Do not make up facts that are not supported by the context.
- Do not use outside knowledge.
- Do not overstate what the context says.
- If the context says something can happen, can appear, can be crafted, can be summoned, or becomes available, describe it that way.
- Do not describe something as already completed, already summoned, or guaranteed unless the context clearly says that.
- Do not invent chance, probability, drop-rate, spawn-rate, or likelihood claims unless the context clearly provides that information.
- Do not turn a requirement into a recommendation. If the context says something requires a condition, state it as a condition.
- If the retrieved context is not enough to answer well, say what is missing instead of guessing.
- Avoid strong timing words like "immediately," "always," or "guaranteed" unless that timing or certainty is directly important to the user's question.
- When answering progression questions, prefer practical availability wording like "becomes available," "can start appearing," or "is unlocked" instead of focusing on exact timing unless the user asks about timing.

Answer rules:
- Give the most helpful direct answer you can from the context.
- If a source is a guide or strategy page, use it for practical advice when it is relevant.
- Do not say the context lacks preparation or strategy advice if a relevant guide or strategy source is included.
- Keep the answer concise and beginner-friendly.
- Sound like a helpful Terraria player, not a formal report.
- Do not dump raw wiki text.
- Do not mention the AI model or retrieval system.
- Do not include source URLs or a "Sources used" line, because the app displays source buttons separately.
- For acquisition questions, prioritize direct ways to obtain or craft the item before mentioning alternate, recycling, conversion, or edge-case methods.
- Do not emphasize methods that require the user to already have the item unless the user specifically asks about recycling, shimmer, reforging, converting, or replacing it.
- Do not treat nearby mentioned accessories, buffs, upgrades, or support items as ingredients or obtain methods unless the context explicitly says they are required to craft, buy, find, or receive the item.
- Clearly separate “how to obtain the item” from “items that help after you have it.”

Style:
- Prefer one short paragraph.
- Use bullets only if they make the answer easier to read.
- Avoid vague filler like "take action accordingly," "prepare sufficiently," or "you are ready."
- If the user asks what to do next, explain the next target or unlock clearly, then mention any useful preparation details found in the context.

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