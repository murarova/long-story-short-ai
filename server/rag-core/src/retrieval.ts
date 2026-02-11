import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { readFileSync } from "node:fs";

function normalizeQuery(query: string): string {
  return query.replace(/['']/g, "'").trim().replace(/\s+/g, " ");
}

function tokenizeQuery(query: string): string[] {
  const cleaned = query
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
  if (!cleaned) return [];
  return cleaned.split(/\s+/g).filter(Boolean);
}

export type QueryExpansionsConfig = {
  maxExtraPhrases: number;
  tokenSynonyms: Record<string, string[]>;
  phraseSynonyms: Record<string, string[]>;
};

export const DEFAULT_QUERY_EXPANSIONS: QueryExpansionsConfig = {
  maxExtraPhrases: 8,
  tokenSynonyms: {},
  phraseSynonyms: {},
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => normalizeQuery(v))
    .filter(Boolean);
}

function asStringArrayRecord(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof k !== "string") continue;
    const arr = asStringArray(v);
    if (arr.length > 0) out[k.toLowerCase()] = arr;
  }
  return out;
}

function loadQueryExpansionsConfig(
  queryExpansionsPath?: string | null,
  queryExpansions?: QueryExpansionsConfig | null
): QueryExpansionsConfig {
  try {
    if (queryExpansions) return queryExpansions;
    if (!queryExpansionsPath) return DEFAULT_QUERY_EXPANSIONS;
    const raw = readFileSync(queryExpansionsPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const maxExtraPhrasesRaw = parsed.maxExtraPhrases;
    const maxExtraPhrases =
      typeof maxExtraPhrasesRaw === "number" &&
      Number.isFinite(maxExtraPhrasesRaw)
        ? Math.max(0, Math.floor(maxExtraPhrasesRaw))
        : DEFAULT_QUERY_EXPANSIONS.maxExtraPhrases;
    return {
      maxExtraPhrases,
      tokenSynonyms: asStringArrayRecord(parsed.tokenSynonyms),
      phraseSynonyms: asStringArrayRecord(parsed.phraseSynonyms),
    };
  } catch {
    return DEFAULT_QUERY_EXPANSIONS;
  }
}

function tokenVariants(token: string): string[] {
  const variants = new Set<string>();
  variants.add(token);
  variants.add(token.replace(/'/g, ""));
  if (token.endsWith("s") && token.length > 3) variants.add(token.slice(0, -1));
  return Array.from(variants).filter(Boolean);
}

function expandQuery(
  query: string,
  queryExpansions: QueryExpansionsConfig
): string {
  const normalized = normalizeQuery(query);
  const tokens = tokenizeQuery(normalized);
  const lowerQuery = ` ${normalized.toLowerCase()} `;
  const phrases = new Set<string>();

  for (const token of tokens) {
    for (const variant of tokenVariants(token)) {
      const adds = queryExpansions.tokenSynonyms[variant];
      if (!adds) continue;
      for (const a of adds) phrases.add(a);
    }
  }

  for (const [phrase, adds] of Object.entries(queryExpansions.phraseSynonyms)) {
    const needle = ` ${normalizeQuery(phrase).toLowerCase()} `;
    if (!needle.trim()) continue;
    if (!lowerQuery.includes(needle)) continue;
    for (const a of adds) phrases.add(a);
  }

  const limited = Array.from(phrases).slice(0, queryExpansions.maxExtraPhrases);
  if (limited.length === 0) return normalized;
  return normalizeQuery(`${normalized} ${limited.join(" ")}`);
}

function applyMetadataFilter(
  doc: Document,
  filterDict: Record<string, any>
): boolean {
  if (!filterDict || Object.keys(filterDict).length === 0) {
    return true;
  }

  const docMetadata = doc.metadata;
  for (const [key, value] of Object.entries(filterDict)) {
    if (!(key in docMetadata)) {
      return false;
    }
    if (docMetadata[key] !== value) {
      return false;
    }
  }
  return true;
}

function docKey(doc: Document): string {
  const contentPreview = doc.pageContent.substring(0, 100);
  const metadataStr = JSON.stringify(
    Object.keys(doc.metadata)
      .sort()
      .map((k) => [k, doc.metadata[k]])
  );
  return `${contentPreview}|${metadataStr}`;
}

class LruCache<K, V> {
  private map: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.map = new Map();
    this.maxSize = Math.max(1, maxSize);
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      const firstKey = this.map.keys().next().value as K | undefined;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
  }
}

export class HybridRetriever extends BaseRetriever {
  static lc_name(): string {
    return "HybridRetriever";
  }

  get lc_namespace(): string[] {
    return ["rag-project-ts", "retrievers"];
  }

  private vectorStore: FaissStore;
  private k: number;
  private vectorWeight: number;
  private bm25Weight: number;
  private metadataFilter: Record<string, any>;
  private bm25Retriever: BM25Retriever;
  private docKeyToDoc: Map<string, Document>;
  private docKeyFunc: (doc: Document) => string;
  private cache: LruCache<string, Document[]>;
  private queryExpansions: QueryExpansionsConfig;

  constructor(
    vectorStore: FaissStore,
    documents: Document[],
    k: number = 4,
    vectorWeight: number = 0.5,
    bm25Weight: number = 0.5,
    metadataFilter: Record<string, any> = {},
    queryExpansionsPath?: string | null,
    queryExpansions?: QueryExpansionsConfig | null
  ) {
    super();
    this.vectorStore = vectorStore;
    this.k = k;
    this.vectorWeight = vectorWeight;
    this.bm25Weight = bm25Weight;
    this.metadataFilter = metadataFilter;
    this.cache = new LruCache(256);
    this.queryExpansions = loadQueryExpansionsConfig(
      queryExpansionsPath,
      queryExpansions
    );

    this.bm25Retriever = BM25Retriever.fromDocuments(documents, {
      k: this.k * 4,
    });

    this.docKeyFunc = docKey;
    this.docKeyToDoc = new Map();
    documents.forEach((doc) => {
      this.docKeyToDoc.set(this.docKeyFunc(doc), doc);
    });
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const expandedQuery = expandQuery(query, this.queryExpansions);
    const cacheKey = JSON.stringify({
      q: expandedQuery,
      k: this.k,
      vw: this.vectorWeight,
      bw: this.bm25Weight,
      f: this.metadataFilter,
    });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const vectorDocs = await this.vectorStore.similaritySearch(
      expandedQuery,
      this.k * 4,
      this.metadataFilter
    );

    let filteredVectorDocs = vectorDocs;
    if (Object.keys(this.metadataFilter).length > 0) {
      filteredVectorDocs = vectorDocs.filter((doc) =>
        applyMetadataFilter(doc, this.metadataFilter)
      );
    }

    let bm25Docs = await this.bm25Retriever.invoke(expandedQuery);
    if (Object.keys(this.metadataFilter).length > 0) {
      bm25Docs = bm25Docs.filter((doc) =>
        applyMetadataFilter(doc, this.metadataFilter)
      );
    }

    const vectorDocMap = new Map<string, Document>();
    for (const vecDoc of filteredVectorDocs) {
      const vecKey = this.docKeyFunc(vecDoc);
      vectorDocMap.set(vecKey, this.docKeyToDoc.get(vecKey) || vecDoc);
    }

    const docScores = new Map<string, { doc: Document; score: number }>();

    filteredVectorDocs.forEach((vecDoc, rank) => {
      const key = this.docKeyFunc(vecDoc);
      const doc = vectorDocMap.get(key) || vecDoc;
      if (!docScores.has(key)) {
        docScores.set(key, { doc, score: 0.0 });
      }
      const entry = docScores.get(key)!;
      entry.score += this.vectorWeight / (60 + rank + 1);
    });

    bm25Docs.forEach((doc, rank) => {
      const key = this.docKeyFunc(doc);
      if (!docScores.has(key)) {
        docScores.set(key, { doc, score: 0.0 });
      }
      const entry = docScores.get(key)!;
      entry.score += this.bm25Weight / (60 + rank + 1);
    });

    const sortedDocs = Array.from(docScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.k)
      .map((item) => item.doc);

    this.cache.set(cacheKey, sortedDocs);
    return sortedDocs;
  }
}
