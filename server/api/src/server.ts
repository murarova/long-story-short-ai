import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load a single repo-root .env (so you don't need per-package env files)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../../.env"), override: true });

import express from "express";
import cors from "cors";
import { authSid } from "./middleware/authSid.js";
import { createIngestionsRouter } from "./routes/ingestions.routes.js";
import { IngestionService } from "./services/ingestionService.js";

const app = express();
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(authSid);

const svc = new IngestionService();
await svc.init();

app.use(createIngestionsRouter(svc));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  process.stdout.write(`API listening on http://localhost:${port}\n`);
});
