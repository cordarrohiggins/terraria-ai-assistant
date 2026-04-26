import type { WikiChunkSearchResult } from "@/lib/searchWikiChunks";

export type WikiSource = {
  title: string;
  url: string;
};

export type WikiContext = {
  contextText: string;
  sources: WikiSource[];
};

export function buildWikiContext(results: WikiChunkSearchResult[]): WikiContext {
  const contextText = results
    .map((result, index) => {
      return [
        `Source ${index + 1}: ${result.chunk.title}`,
        `URL: ${result.chunk.sourceUrl}`,
        `Text:`,
        result.chunk.text,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const sources = [
    ...new Map(
      results.map((result) => [
        result.chunk.sourceUrl,
        {
          title: result.chunk.title,
          url: result.chunk.sourceUrl,
        },
      ]),
    ).values(),
  ];

  return {
    contextText,
    sources,
  };
}