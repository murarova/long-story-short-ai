import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function chunkDocuments(
  documents: Document[],
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunkedDocs = await splitter.splitDocuments(documents);

  chunkedDocs.forEach((chunk, idx) => {
    chunk.metadata = chunk.metadata || {};
    chunk.metadata.chunk_index = idx;
    chunk.metadata.source_type = chunk.metadata.source_type || "unknown";
    chunk.metadata.access_level = "public";

    if (!chunk.metadata.source_display) {
      const sourceType = chunk.metadata.source_type || "unknown";
      if (sourceType === "audio") {
        chunk.metadata.source_display = "Audio Transcript";
      } else {
        chunk.metadata.source_display = "Unknown Source";
      }
    }
  });

  return chunkedDocs;
}

