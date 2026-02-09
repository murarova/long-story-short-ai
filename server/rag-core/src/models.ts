import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Embeddings } from "@langchain/core/embeddings";
import { GOOGLE_CHAT_MODEL } from "./config.js";

export function getEmbeddings(
  modelName: string = process.env.GOOGLE_EMBEDDING_MODEL ||
    "gemini-embedding-001",
): Embeddings {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is not set.");
  }
  return new GoogleGenerativeAIEmbeddings({
    model: modelName,
    apiKey,
  });
}

export function getChatModel(
  modelName: string = GOOGLE_CHAT_MODEL,
  temperature: number = 0.2,
): ChatGoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is not set.");
  }
  const finalModelName = process.env.GOOGLE_CHAT_MODEL || modelName;

  return new ChatGoogleGenerativeAI({
    model: finalModelName,
    temperature,
    apiKey,
  });
}
