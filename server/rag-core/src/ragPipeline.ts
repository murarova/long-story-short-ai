import "dotenv/config";
import { ReadableStream as NodeReadableStream } from "stream/web";

if (typeof globalThis.ReadableStream === "undefined") {
  (globalThis as any).ReadableStream = NodeReadableStream;
}

import { ingestSources } from "./documentLoaders.js";
import { chunkDocuments } from "./chunking.js";
import { getEmbeddings, getChatModel } from "./models.js";
import { buildVectorStore } from "./indexing.js";
import { HybridRetriever } from "./retrieval.js";
import { buildRagChain } from "./ragChain.js";
import { parseArguments, runInteractiveMode } from "./cli.js";
import { VECTOR_DB_PATH, COLLECTION_NAME } from "./config.js";

async function main() {
  const args = parseArguments();
  const documents = await ingestSources({
    audioPath: args.audioPath,
    transcriptCachePath: args.transcriptCachePath,
    forceAudioRecompute: args.forceAudioRecompute,
  });
  const audioCount = documents.filter(
    (doc) => doc.metadata.source_type === "audio"
  ).length;
  console.log(
    `Ingestion complete: ${audioCount} audio transcript document(s) loaded.`
  );

  const chunks = await chunkDocuments(documents);
  console.log(
    `Chunking complete: produced ${chunks.length} chunks from ${documents.length} source document(s).`
  );

  try {
    const embeddings = getEmbeddings();

    const vectorStore = await buildVectorStore(
      chunks,
      embeddings,
      VECTOR_DB_PATH,
      COLLECTION_NAME,
      undefined,
      args.forceRebuild
    );

    const chatModel = getChatModel();

    console.log(
      `Vector store ready at ${VECTOR_DB_PATH} with ${chunks.length} documents indexed.`
    );
    console.log("Using hybrid search (vector + BM25) for retrieval.");

    const metadataFilter = { access_level: "public" };

    const retriever = new HybridRetriever(
      vectorStore,
      chunks,
      12,
      0.45,
      0.55,
      metadataFilter,
      args.queryExpansionsPath
    );

    const ragChain = await buildRagChain(chatModel, retriever);

    await runInteractiveMode(ragChain);
  } catch (error: any) {
    if (error.message?.includes("GOOGLE_API_KEY")) {
      console.log(
        "Embedding step failed. Please verify your `GOOGLE_API_KEY` has access to the " +
          "Generative Language API and try again.\n" +
          `Details: ${error.message}`
      );
    } else {
      console.error("Error:", error.message);
      process.exit(1);
    }
  }
}

main().catch(console.error);
