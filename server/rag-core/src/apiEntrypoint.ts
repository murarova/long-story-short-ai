import { Document } from "@langchain/core/documents";
import { transcribeAudioBufferToDocument } from "./documentLoaders.js";
import { chunkDocuments } from "./chunking.js";
import { getEmbeddings, getChatModel } from "./models.js";
import { buildVectorStoreInMemory } from "./indexing.js";
import { HybridRetriever, QueryExpansionsConfig } from "./retrieval.js";
import { createTranscriptTools } from "./tools.js";
import { buildAgent } from "./agent.js";
import { evaluateAnswer, type EvaluationScores } from "./evaluation.js";

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

export type CreateRagFromTranscriptTextOptions = {
  transcriptText: string;
  transcriptSource?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  k?: number;
  vectorWeight?: number;
  bm25Weight?: number;
  metadataFilter?: Record<string, any>;
  queryExpansions?: QueryExpansionsConfig | null;
  temperature?: number;
};

export type AskResult = {
  answer: string;
  evaluation: EvaluationScores;
};

export type RagFromBuffersSession = {
  ask: (question: string) => Promise<AskResult>;
  chunks: Document[];
  transcriptText: string;
};

async function buildSession(
  chunks: Document[],
  transcriptText: string,
  options: {
    k?: number;
    vectorWeight?: number;
    bm25Weight?: number;
    metadataFilter?: Record<string, any>;
    queryExpansions?: QueryExpansionsConfig | null;
    temperature?: number;
  },
): Promise<RagFromBuffersSession> {
  const embeddings = getEmbeddings();
  const vectorStore = await buildVectorStoreInMemory(chunks, embeddings);
  const temperature = options.temperature ?? 0.2;
  const agentModel = getChatModel(undefined, temperature);
  const toolModel = getChatModel(undefined, temperature);
  const evalModel = getChatModel(undefined, 0);

  const retriever = new HybridRetriever(
    vectorStore,
    chunks,
    options.k ?? 12,
    options.vectorWeight ?? 0.45,
    options.bm25Weight ?? 0.55,
    options.metadataFilter ?? { access_level: "public" },
    null,
    options.queryExpansions ?? null,
  );

  const tools = createTranscriptTools({
    retriever,
    chatModel: toolModel,
    transcriptText,
  });

  const agentAsk = await buildAgent(agentModel, tools);

  return {
    ask: async (question: string): Promise<AskResult> => {
      const result = await agentAsk(question);

      const evaluation = await evaluateAnswer(
        evalModel,
        question,
        result.answer,
        result.retrievedContext,
      );

      return { answer: result.answer, evaluation };
    },
    chunks,
    transcriptText,
  };
}

export async function createRagFromAudioBuffer(
  options: CreateRagFromAudioOptions,
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
    options.chunkOverlap ?? 200,
  );

  return buildSession(chunks, transcriptText, options);
}

export async function createRagFromTranscriptText(
  options: CreateRagFromTranscriptTextOptions,
): Promise<RagFromBuffersSession> {
  const transcriptText = options.transcriptText ?? "";
  const documents = [
    new Document({
      pageContent: transcriptText,
      metadata: {
        source_type: "audio",
        source_display: "Audio Transcript",
        audio_source: options.transcriptSource || "transcript",
      },
    }),
  ];

  const chunks = await chunkDocuments(
    documents,
    options.chunkSize ?? 1000,
    options.chunkOverlap ?? 200,
  );

  return buildSession(chunks, transcriptText, options);
}
