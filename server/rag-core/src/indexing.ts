import { createHash } from "crypto";
import {
  existsSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "fs";
import { join, dirname } from "path";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";
import {
  VECTOR_DB_PATH,
  COLLECTION_NAME,
  INDEX_MANIFEST_PATH,
} from "./config.js";

interface Manifest {
  [key: string]: {
    file_hash: string;
    source_path: string;
    source_type?: string;
    indexed_at: string;
  };
}

function computeFileHash(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}

function loadIndexManifest(manifestPath: string): Manifest {
  if (existsSync(manifestPath)) {
    const content = readFileSync(manifestPath, "utf-8");
    return JSON.parse(content);
  }
  return {};
}

function saveIndexManifest(manifestPath: string, manifest: Manifest): void {
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

function getDocumentSourceKey(doc: Document): string {
  const sourcePath = doc.metadata.source_path || doc.metadata.source || "";
  const sourceType = doc.metadata.source_type || "unknown";
  const pageNumber = doc.metadata.page_number;
  const chunkIndex = doc.metadata.chunk_index;

  if (sourceType === "pdf" && pageNumber) {
    return `${sourcePath}:page_${pageNumber}`;
  } else if (sourceType === "audio") {
    return `${sourcePath}:audio`;
  } else if (chunkIndex !== undefined) {
    return `${sourcePath}:chunk_${chunkIndex}`;
  } else {
    return `${sourcePath}:${sourceType}`;
  }
}

function detectChangedSources(
  documents: Document[],
  manifest: Manifest
): [Document[], string[]] {
  const changedDocs: Document[] = [];
  const sourcesToRemove: string[] = [];
  const currentHashes: Record<string, string> = {};

  for (const doc of documents) {
    const sourcePath = doc.metadata.source_path || doc.metadata.source;
    if (sourcePath && existsSync(sourcePath)) {
      if (!currentHashes[sourcePath]) {
        currentHashes[sourcePath] = computeFileHash(sourcePath);
      }
    }
  }

  for (const doc of documents) {
    const sourceKey = getDocumentSourceKey(doc);
    const sourcePath = doc.metadata.source_path || doc.metadata.source;

    if (!sourcePath || !existsSync(sourcePath)) {
      changedDocs.push(doc);
      sourcesToRemove.push(sourceKey);
      continue;
    }

    const fileHash = currentHashes[sourcePath];
    const manifestEntry = manifest[sourceKey] || {};
    const storedHash = manifestEntry.file_hash;

    if (storedHash !== fileHash) {
      changedDocs.push(doc);
      sourcesToRemove.push(sourceKey);
    }
  }

  return [changedDocs, sourcesToRemove];
}

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

export async function buildVectorStore(
  documents: Document[],
  embeddings: Embeddings,
  persistDirectory: string = VECTOR_DB_PATH,
  collectionName: string = COLLECTION_NAME,
  manifestPath: string = INDEX_MANIFEST_PATH,
  forceRebuild: boolean = false
): Promise<FaissStore> {
  const manifest = forceRebuild ? {} : loadIndexManifest(manifestPath);

  let vectorStore: FaissStore | null = null;
  const indexPath = join(persistDirectory, "faiss.index");
  const docstorePath = join(persistDirectory, "docstore.json");

  if (forceRebuild || !existsSync(indexPath)) {
    if (existsSync(persistDirectory)) {
      rmSync(persistDirectory, { recursive: true, force: true });
    }
    mkdirSync(persistDirectory, { recursive: true });
  } else {
    try {
      vectorStore = await FaissStore.load(persistDirectory, embeddings);
    } catch (error) {
      if (existsSync(persistDirectory)) {
        rmSync(persistDirectory, { recursive: true, force: true });
      }
      mkdirSync(persistDirectory, { recursive: true });
      vectorStore = null;
    }
  }

  let changedDocs: Document[];
  let sourcesToRemove: string[];

  if (!vectorStore) {
    changedDocs = documents;
    sourcesToRemove = [];
    console.log("Building vector store from scratch...");
  } else {
    [changedDocs, sourcesToRemove] = detectChangedSources(documents, manifest);
    if (changedDocs.length > 0) {
      console.log(
        `Detected ${changedDocs.length} changed documents. Re-indexing...`
      );
    } else {
      console.log("No document changes detected. Using existing index.");
    }
  }

  if (vectorStore && sourcesToRemove.length > 0) {
    try {
      const existingDocs = await vectorStore.similaritySearch("", 10000);
      const idsToDelete: string[] = [];

      for (let i = 0; i < existingDocs.length; i++) {
        const doc = existingDocs[i];
        const sourceKey = getDocumentSourceKey(doc);
        if (sourcesToRemove.includes(sourceKey)) {
          idsToDelete.push(String(i));
        }
      }

      if (idsToDelete.length > 0) {
        await vectorStore.delete({ ids: idsToDelete });
        console.log(
          `Removed ${idsToDelete.length} outdated documents from index.`
        );
      }
    } catch (error: any) {
      console.log(
        `Warning: Could not remove old documents: ${error.message}. Continuing with re-indexing...`
      );
    }
  }

  if (changedDocs.length > 0) {
    const sanitizedDocuments = changedDocs.map((doc) => {
      const sanitized = new Document({
        pageContent: doc.pageContent,
        metadata: sanitizeMetadata(doc.metadata),
      });
      return sanitized;
    });

    if (!vectorStore) {
      vectorStore = await FaissStore.fromDocuments(
        sanitizedDocuments,
        embeddings
      );
    } else {
      await vectorStore.addDocuments(sanitizedDocuments);
    }

    await vectorStore.save(persistDirectory);

    const currentHashes: Record<string, string> = {};
    for (const doc of changedDocs) {
      const sourcePath = doc.metadata.source_path || doc.metadata.source;
      if (sourcePath && existsSync(sourcePath)) {
        if (!currentHashes[sourcePath]) {
          currentHashes[sourcePath] = computeFileHash(sourcePath);
        }
      }
    }

    const updatedManifest = { ...manifest };
    for (const doc of changedDocs) {
      const sourceKey = getDocumentSourceKey(doc);
      const sourcePath = doc.metadata.source_path || doc.metadata.source;
      const fileHash = sourcePath ? currentHashes[sourcePath] || "" : "";

      updatedManifest[sourceKey] = {
        file_hash: fileHash,
        source_path: sourcePath || "",
        source_type: doc.metadata.source_type,
        indexed_at:
          sourcePath && existsSync(sourcePath)
            ? String(statSync(sourcePath).mtimeMs)
            : "",
      };
    }

    saveIndexManifest(manifestPath, updatedManifest);
    console.log(`Indexed ${changedDocs.length} documents.`);
  }

  if (!vectorStore) {
    throw new Error("Failed to create vector store");
  }

  return vectorStore;
}
