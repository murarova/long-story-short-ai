import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import {
  askIngestion,
  createIngestion,
  getIngestion,
  getTranscript,
} from "../controllers/ingestionsController.js";
import type { IngestionService } from "../services/ingestionService.js";
import { uploadsDir } from "../services/ingestionService.js";

const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160) || "audio";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}-${sanitizeFileName(file.originalname)}`),
  }),
});

export const createIngestionsRouter = (
  svc: IngestionService
): express.Router => {
  const router = express.Router();

  router.post("/ingestions", upload.single("audio"), createIngestion(svc));
  router.get("/ingestions/:id", getIngestion(svc));
  router.get("/ingestions/:id/transcript", getTranscript(svc));
  router.post("/ingestions/:id/ask", askIngestion(svc));

  return router;
};
