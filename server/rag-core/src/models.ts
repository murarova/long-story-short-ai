import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { Embeddings } from "@langchain/core/embeddings";
import { GOOGLE_CHAT_MODEL } from "./config.js";

export function getEmbeddings(
  modelName: string = process.env.OPENAI_EMBEDDING_MODEL ||
    "text-embedding-3-small",
): Embeddings {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }
  return new OpenAIEmbeddings({
    model: modelName,
    apiKey,
  });
}

export function getChatModel(
  modelName: string = GOOGLE_CHAT_MODEL,
  temperature: number = 0.2,
): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }
  const finalModelName = process.env.OPENAI_CHAT_MODEL || modelName;

  return new ChatOpenAI({
    model: finalModelName,
    temperature,
    apiKey,
  });
}
