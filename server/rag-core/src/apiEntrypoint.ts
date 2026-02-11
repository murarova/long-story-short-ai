import { Document } from "@langchain/core/documents";
import { transcribeAudioBufferToDocument } from "./documentLoaders.js";
import { chunkDocuments } from "./chunking.js";
import { getEmbeddings, getChatModel } from "./models.js";
import { buildVectorStoreInMemory } from "./indexing.js";
import { HybridRetriever, QueryExpansionsConfig } from "./retrieval.js";
import { createTranscriptTools } from "./tools.js";
import { buildAgent } from "./agent.js";
import { evaluateAnswer, type EvaluationScores } from "./evaluation.js";
import { GOOGLE_CHAT_MODEL_LIGHT } from "./config.js";
import type { ChatOpenAI } from "@langchain/openai";

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
  toolCalls: string[];
  retrievedContext: string;
  // Optional: turned off for interactive chat to save model calls.
  evaluation?: EvaluationScores;
};

export type RagFromBuffersSession = {
  ask: (question: string) => Promise<AskResult>;
  chunks: Document[];
  transcriptText: string;
};

type ModelCounterKey = "agent" | "helper" | "eval";
type ModelCounters = Record<ModelCounterKey, number>;

function instrumentModel(
  model: ChatOpenAI,
  counters: ModelCounters,
  key: ModelCounterKey,
): ChatOpenAI {
  const originalInvoke = model.invoke.bind(model) as (
    input: unknown,
    options?: unknown,
  ) => Promise<unknown>;
  (model as any).invoke = async (input: unknown, options?: unknown) => {
    counters[key] += 1;
    return originalInvoke(input, options);
  };
  return model;
}

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
  const counters: ModelCounters = { agent: 0, helper: 0, eval: 0 };
  const agentModel = instrumentModel(
    getChatModel(undefined, temperature),
    counters,
    "agent",
  );
  const helperModel = instrumentModel(
    getChatModel(GOOGLE_CHAT_MODEL_LIGHT, temperature),
    counters,
    "helper",
  );
  const evalModel = instrumentModel(
    getChatModel(GOOGLE_CHAT_MODEL_LIGHT, 0),
    counters,
    "eval",
  );
  const answerCache = new Map<string, AskResult>();

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
    chatModel: helperModel,
    transcriptText,
  });

  const agentAsk = await buildAgent(agentModel, tools);

  return {
    ask: async (question: string): Promise<AskResult> => {
      const key = question.trim().replace(/\s+/g, " ").toLowerCase();
      const cached = answerCache.get(key);
      if (cached) return cached;

      counters.agent = 0;
      counters.helper = 0;
      counters.eval = 0;
      const startedAt = Date.now();

      const result = await agentAsk(question);

      // Only run evaluation for summarization-style questions to save tokens.
      const normalized = question.toLowerCase();
      const isSummaryQuestion = normalized.startsWith(
        "create a concise summary of the audio content.",
      );

      let evaluation: EvaluationScores | undefined;
      if (isSummaryQuestion) {
        evaluation = await evaluateAnswer(
          evalModel,
          question,
          result.answer,
          result.retrievedContext,
        );
      }

      const fullResult: AskResult = {
        answer: result.answer,
        toolCalls: result.toolCalls,
        retrievedContext: result.retrievedContext,
        evaluation,
      };

      const elapsedMs = Date.now() - startedAt;
      const totalCalls = counters.agent + counters.helper + counters.eval;
      console.log(
        JSON.stringify({
          at: "rag.ask.metrics",
          agentCalls: counters.agent,
          helperCalls: counters.helper,
          evalCalls: counters.eval,
          totalModelCalls: totalCalls,
          elapsedMs,
        }),
      );

      answerCache.set(key, fullResult);
      return fullResult;
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
