import { Document } from "@langchain/core/documents";
import { transcribeAudioBufferToDocument } from "./documentLoaders.js";
import { chunkDocuments } from "./chunking.js";
import { getEmbeddings, getChatModel } from "./models.js";
import { buildVectorStoreInMemory } from "./indexing.js";
import { HybridRetriever, QueryExpansionsConfig } from "./retrieval.js";
import { buildRagChain } from "./ragChain.js";

export type CreateRagFromAudioOptions = {
  audioBuffer: Uint8Array;
  audioSource?: string;
  audioFileName?: string;
  audioMimeType?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  k?: number;
  vectorWeight?: number;
  bm25Weight?: number;
  metadataFilter?: Record<string, any>;
  queryExpansions?: QueryExpansionsConfig | null;
  temperature?: number;
};

export type RagFromBuffersSession = {
  ask: (question: string) => Promise<{ answer: string }>;
  chunks: Document[];
  transcriptText: string;
};

export async function createRagFromAudioBuffer(
  options: CreateRagFromAudioOptions
): Promise<RagFromBuffersSession> {
  const documents = await transcribeAudioBufferToDocument(options.audioBuffer, {
    audioSource: options.audioSource || options.audioFileName || "audio",
    fileName: options.audioFileName || "audio",
    mimeType: options.audioMimeType || "application/octet-stream",
  });

  const transcriptText = documents[0]?.pageContent ?? "";

  const chunks = await chunkDocuments(
    documents,
    options.chunkSize ?? 1000,
    options.chunkOverlap ?? 200
  );

  const embeddings = getEmbeddings();
  const vectorStore = await buildVectorStoreInMemory(chunks, embeddings);
  const chatModel = getChatModel(undefined, options.temperature ?? 0.2);

  const retriever = new HybridRetriever(
    vectorStore,
    chunks,
    options.k ?? 12,
    options.vectorWeight ?? 0.45,
    options.bm25Weight ?? 0.55,
    options.metadataFilter ?? { access_level: "public" },
    null,
    options.queryExpansions ?? null
  );

  const ragChain = await buildRagChain(chatModel, retriever);

  return {
    ask: async (question: string) => ragChain({ input: question }),
    chunks,
    transcriptText,
  };
}
