import type express from "express";
import type { QueryExpansionsConfig } from "rag-core";
import type { IngestionService } from "../services/ingestionService.js";

const parseQueryExpansions = (
  raw: unknown
): { value: QueryExpansionsConfig | null; error: string | null } => {
  if (typeof raw !== "string" || !raw.trim())
    return { value: null, error: null };
  try {
    return { value: JSON.parse(raw) as QueryExpansionsConfig, error: null };
  } catch {
    return { value: null, error: "Invalid queryExpansions JSON" };
  }
};

const readQuestion = (body: unknown): string => {
  const q =
    body && typeof body === "object" && "question" in body
      ? (body as { question?: unknown }).question
      : "";
  return typeof q === "string" ? q.trim() : "";
};

export const createIngestion =
  (svc: IngestionService) =>
  async (req: express.Request, res: express.Response) => {
    const audio = req.file;
    if (!audio)
      return res.status(400).json({ error: "Missing file field: audio" });

    const ownerId = String(res.locals.ownerId || "");

    const { value: queryExpansions, error: queryExpansionsError } =
      parseQueryExpansions((req.body as any)?.queryExpansions);
    if (queryExpansionsError)
      return res.status(400).json({ error: queryExpansionsError });

    const record = await svc.createFromUpload({
      ownerId,
      audio,
      queryExpansions,
    });
    res.status(202).json({ ingestionId: record.id, status: record.status });
  };

export const getIngestion =
  (svc: IngestionService) => (req: express.Request, res: express.Response) => {
    const ownerId = String(res.locals.ownerId || "");
    const record = svc.get(ownerId, req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    res.json(svc.publicIngestion(record));
  };

export const getTranscript =
  (svc: IngestionService) =>
  async (req: express.Request, res: express.Response) => {
    const ownerId = String(res.locals.ownerId || "");
    const record = svc.get(ownerId, req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    if (record.status !== "ready" || !record.transcriptPath)
      return res.status(409).json({ error: "Ingestion not ready" });

    try {
      const text = await svc.getTranscriptText(ownerId, req.params.id);
      if (typeof text !== "string")
        return res.status(409).json({ error: "Ingestion not ready" });
      res.type("text/plain").send(text);
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Error" });
    }
  };

export const askIngestion =
  (svc: IngestionService) =>
  async (req: express.Request, res: express.Response) => {
    const ownerId = String(res.locals.ownerId || "");
    const record = svc.get(ownerId, req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    if (record.status !== "ready" || !record.ask)
      return res.status(409).json({ error: "Ingestion not ready" });

    const question = readQuestion(req.body);
    if (!question) return res.status(400).json({ error: "Missing question" });

    try {
      const out = await svc.ask(ownerId, req.params.id, question);
      if (!out) return res.status(409).json({ error: "Ingestion not ready" });
      res.json(out);
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Error" });
    }
  };
