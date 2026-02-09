import { createAgent, AIMessage, ToolMessage } from "langchain";
import type { BaseMessage } from "@langchain/core/messages";
import type { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { DynamicTool } from "@langchain/core/tools";

const AGENT_SYSTEM_PROMPT =
  "You are a helpful AI assistant answering questions about an audio transcript. " +
  "You have access to tools that let you search the transcript, retrieve the full text, " +
  "and generate summaries.\n\n" +
  "Follow these steps when answering:\n" +
  "1. Analyse the user's question to understand what information is needed.\n" +
  "2. Use the appropriate tool(s) to retrieve relevant information.\n" +
  "3. After receiving tool results, reflect on whether you have enough information:\n" +
  "   - If the context is sufficient, formulate a clear, grounded answer.\n" +
  "   - If the context is insufficient, try a different search query or use another tool.\n" +
  "4. Before giving your final answer, verify it is supported by the retrieved context.\n" +
  "5. If you cannot find relevant information after multiple attempts, state that clearly.\n\n" +
  "Always cite information as coming from the audio transcript.";

export type AgentAskResult = {
  answer: string;
  toolCalls: string[];
  retrievedContext: string;
};

function textContent(msg: BaseMessage): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((p) => {
        if (typeof p === "string") return p;
        if (typeof p === "object" && p !== null && "text" in p) {
          return (p as { text: string }).text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

export async function buildAgent(
  chatModel: ChatGoogleGenerativeAI,
  tools: DynamicTool[],
): Promise<(question: string) => Promise<AgentAskResult>> {
  const agent = createAgent({
    model: chatModel,
    tools,
    systemPrompt: AGENT_SYSTEM_PROMPT,
  });

  return async (question: string): Promise<AgentAskResult> => {
    const result = await agent.invoke(
      { messages: [{ role: "user" as const, content: question }] },
      { recursionLimit: 12 },
    );

    const messages: BaseMessage[] = result.messages ?? [];

    const toolCalls: string[] = [];
    const contextParts: string[] = [];

    for (const msg of messages) {
      if (msg instanceof AIMessage && msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          toolCalls.push(tc.name);
        }
      }
      if (msg instanceof ToolMessage) {
        const text = textContent(msg);
        if (text) contextParts.push(text);
      }
    }

    const lastMsg = messages[messages.length - 1];
    const answer =
      lastMsg instanceof AIMessage ? textContent(lastMsg) : "";

    return {
      answer: answer || "I was unable to generate an answer.",
      toolCalls,
      retrievedContext: contextParts.join("\n\n"),
    };
  };
}
