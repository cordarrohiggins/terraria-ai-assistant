type OllamaGenerateResponse = {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
};

type GenerateWithOllamaInput = {
  prompt: string;
  model?: string;
};

const OLLAMA_API_URL = "http://localhost:11434/api/generate";
const DEFAULT_OLLAMA_MODEL = "llama3.2:3b";

export async function generateWithOllama({
  prompt,
  model = DEFAULT_OLLAMA_MODEL,
}: GenerateWithOllamaInput) {
  const response = await fetch(OLLAMA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OllamaGenerateResponse;

  return data.response.trim();
}