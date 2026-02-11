import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import {
  askIngestion,
  createIngestion,
  createIngestionFromLink,
  deleteAllIngestions,
  deleteIngestion,
  getIngestion,
  getTranscript,
} from "../controllers/ingestionsController.js";
import type { IngestionService } from "../services/ingestionService.js";
import { uploadsDir } from "../services/ingestionService.js";

const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160) || "audio";

const ALLOWED_AUDIO_EXT = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".webm",
]);
const ALLOWED_VIDEO_EXT = new Set([".mp4", ".mov", ".mkv", ".webm"]);

const isAllowedUpload = (file: Express.Multer.File): boolean => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (file.mimetype?.startsWith("audio/")) return true;
  if (file.mimetype?.startsWith("video/")) return true;
  if (ALLOWED_AUDIO_EXT.has(ext)) return true;
  if (ALLOWED_VIDEO_EXT.has(ext)) return true;
  return false;
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}-${sanitizeFileName(file.originalname)}`),
  }),
  fileFilter: (_req, file, cb) => {
    if (isAllowedUpload(file)) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

export const createIngestionsRouter = (
  svc: IngestionService,
): express.Router => {
  const router = express.Router();

  router.post("/ingestions", upload.single("audio"), createIngestion(svc));
  router.post("/ingestions/link", createIngestionFromLink(svc));
  router.get("/ingestions/:id", getIngestion(svc));
  router.get("/ingestions/:id/transcript", getTranscript(svc));
  router.post("/ingestions/:id/ask", askIngestion(svc));
  router.delete("/ingestions/:id", deleteIngestion(svc));
  router.delete("/ingestions", deleteAllIngestions(svc));

  return router;
};
