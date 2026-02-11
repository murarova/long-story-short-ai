import { DynamicTool } from "@langchain/core/tools";
import type { BaseRetriever } from "@langchain/core/retrievers";
import type { ChatOpenAI } from "@langchain/openai";

export type ToolContext = {
  retriever: BaseRetriever;
  chatModel: ChatOpenAI;
  transcriptText: string;
};

export function createTranscriptTools(ctx: ToolContext): DynamicTool[] {
  const searchTranscript = new DynamicTool({
    name: "search_transcript",
    description:
      "Search through the audio transcript for specific information. " +
      "Pass a natural-language search query and receive the most relevant chunks.",
    func: async (query: string) => {
      const docs = await ctx.retriever.invoke(query);
      if (docs.length === 0) return "No relevant content found for this query.";
      return docs
        .map((doc, i) => `[Chunk ${i + 1}]\n${doc.pageContent}`)
        .join("\n\n");
    },
  });

  const getFullTranscript = new DynamicTool({
    name: "get_full_transcript",
    description:
      "Return the complete transcript text. " +
      "Use when the user asks about the overall content or you need broad context.",
    func: async () => {
      if (!ctx.transcriptText.trim()) return "Transcript is empty.";
      const maxLen = 12_000;
      if (ctx.transcriptText.length > maxLen) {
        return (
          ctx.transcriptText.slice(0, maxLen) + "\n\n[...transcript truncated]"
        );
      }
      return ctx.transcriptText;
    },
  });

  let cachedSummary: string | null = null;

  const getSummary = new DynamicTool({
    name: "get_summary",
    description:
      "Generate a concise summary of the entire transcript. " +
      "Use when the user asks for an overview, key points, or a summary.",
    func: async () => {
      if (cachedSummary) return cachedSummary;

      const truncated =
        ctx.transcriptText.length > 10_000
          ? ctx.transcriptText.slice(0, 10_000) + "\n[...truncated]"
          : ctx.transcriptText;

      const response = await ctx.chatModel.invoke([
        {
          role: "system",
          content:
            "You are a summarization assistant. Provide a clear, concise summary " +
            "of the following transcript. Focus on the key points, main topics, " +
            "and important takeaways. Respond in the same language as the transcript text unless the user explicitly requested another language.",
        },
        {
          role: "human",
          content: `Summarize this transcript:\n\n${truncated}`,
        },
      ]);

      const text =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      cachedSummary = text;
      return text;
    },
  });

  return [searchTranscript, getFullTranscript, getSummary];
}
