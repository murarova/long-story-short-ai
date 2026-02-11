import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitized[key] = value;
    } else {
      sanitized[key] = String(value);
    }
  }
  return sanitized;
}

export async function buildVectorStoreInMemory(
  documents: Document[],
  embeddings: Embeddings
): Promise<FaissStore> {
  const sanitizedDocuments = documents.map((doc) => {
    const sanitized = new Document({
      pageContent: doc.pageContent,
      metadata: sanitizeMetadata(doc.metadata),
    });
    return sanitized;
  });

  return await FaissStore.fromDocuments(sanitizedDocuments, embeddings);
}
