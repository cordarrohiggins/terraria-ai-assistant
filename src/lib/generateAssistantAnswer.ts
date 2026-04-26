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

Rules:
- Do not make up facts that are not supported by the context.
- Do not overstate what the context says.
- Do not add extra strategy advice unless the context clearly supports it.
- Do not say a boss has been summoned unless the context clearly says it has been summoned.
- If the context says something becomes available, spawns, appears, or can happen, describe it that way.
- If the context does not fully answer the question, say what the context does and does not confirm.
- Do not dump raw wiki text.
- Do not mention that you are using an AI model.
- Do not include fake citations.

Style:
- Sound like a helpful player explaining the answer clearly.
- Keep the answer concise.
- Prefer one short paragraph unless a list is genuinely needed.
- Avoid stiff phrases like "Next steps," "take action accordingly," "prepare by gathering sufficient items," or "you are ready."
- Do not use numbered steps unless the user specifically asks for steps.

Important Terraria wording:
- Plantera's Bulbs appearing or growing does not mean Plantera has already been summoned.
- A Plantera's Bulb is used to summon Plantera when the player breaks it.
- After all three mechanical bosses are defeated for the first time, describe Plantera's Bulbs as becoming able to grow or appearing in the Underground Jungle.

Example of the desired style:
After you beat all three mechanical bosses for the first time, Plantera's Bulbs can start growing in the Underground Jungle. That means your next major progression target is Plantera, but the context here only confirms that the bulbs begin appearing; it does not give full preparation advice for the fight.

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