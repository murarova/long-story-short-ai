import { randomUUID } from "crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "fs/promises";
import { join } from "path";
import {
  createRagFromAudioBuffer,
  createRagFromTranscriptText,
} from "rag-core";
import type { QueryExpansionsConfig, AskResult } from "rag-core";
import { errorDetails } from "../utils/errors.js";
import { extractAudioToMp3, isFfmpegMissingError } from "../utils/ffmpeg.js";
import { logLine } from "../utils/log.js";
import { nowMs } from "../utils/time.js";
import {
  downloadYoutubeAudioToMp3,
  isYtDlpMissingError,
} from "../utils/ytdlp.js";

export type IngestionStatus = "queued" | "processing" | "ready" | "error";

export type IngestionRecord = {
  id: string;
  ownerId: string;
  audioPath: string;
  audioOriginalName: string;
  audioMimeType: string;
  transcriptPath: string | null;
  status: IngestionStatus;
  createdAt: number;
  updatedAt: number;
  error: string | null;
  ask: ((question: string) => Promise<AskResult>) | null;
};

export type PublicIngestion = Pick<
  IngestionRecord,
  "id" | "status" | "error" | "createdAt" | "updatedAt"
>;

const isProd = process.env.NODE_ENV === "production";

export const uploadsDir = join(process.cwd(), "uploads");
export const ingestionsDir = join(process.cwd(), "ingestions");

const ingestionRecordPath = (id: string) => join(ingestionsDir, `${id}.json`);
const ingestionTranscriptPath = (id: string) =>
  join(ingestionsDir, `${id}.txt`);

const isVideoMimeType = (mimeType: string): boolean =>
  mimeType.toLowerCase().startsWith("video/");

const safeUnlink = async (path: string | null | undefined): Promise<void> => {
  if (!path) return;
  try {
    await unlink(path);
  } catch {
    // ignore
  }
};

const persistIngestionRecord = async (
  record: IngestionRecord,
): Promise<void> => {
  const payload = {
    id: record.id,
    ownerId: record.ownerId,
    audioPath: record.audioPath,
    audioOriginalName: record.audioOriginalName,
    audioMimeType: record.audioMimeType,
    transcriptPath: record.transcriptPath,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    error: record.error,
  };

  const target = ingestionRecordPath(record.id);
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(payload), "utf-8");
  await rename(tmp, target);
};

const loadPersistedIngestions = async (
  ingestions: Map<string, IngestionRecord>,
): Promise<void> => {
  try {
    const files = await readdir(ingestionsDir);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(ingestionsDir, f), "utf-8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const id = typeof parsed.id === "string" ? parsed.id : null;
        const ownerId =
          typeof parsed.ownerId === "string" ? parsed.ownerId : null;
        const audioPath =
          typeof parsed.audioPath === "string" ? parsed.audioPath : null;
        const audioOriginalName =
          typeof parsed.audioOriginalName === "string"
            ? parsed.audioOriginalName
            : null;
        const audioMimeType =
          typeof parsed.audioMimeType === "string"
            ? parsed.audioMimeType
            : null;
        const transcriptPath =
          parsed.transcriptPath === null ||
          typeof parsed.transcriptPath === "string"
            ? (parsed.transcriptPath as string | null)
            : null;
        const status =
          parsed.status === "queued" ||
          parsed.status === "processing" ||
          parsed.status === "ready" ||
          parsed.status === "error"
            ? (parsed.status as IngestionStatus)
            : null;
        const createdAt =
          typeof parsed.createdAt === "number" ? parsed.createdAt : null;
        const updatedAt =
          typeof parsed.updatedAt === "number" ? parsed.updatedAt : null;
        const error =
          parsed.error === null || typeof parsed.error === "string"
            ? parsed.error
            : null;

        if (
          !id ||
          !ownerId ||
          !audioPath ||
          !audioOriginalName ||
          !audioMimeType ||
          !status ||
          createdAt === null ||
          updatedAt === null
        ) {
          continue;
        }

        ingestions.set(id, {
          id,
          ownerId,
          audioPath,
          audioOriginalName,
          audioMimeType,
          transcriptPath,
          status,
          createdAt,
          updatedAt,
          error: typeof error === "string" ? error : null,
          ask: null,
        });
      } catch {
        continue;
      }
    }
  } catch {
    return;
  }
};

export class IngestionService {
  private ingestions = new Map<string, IngestionRecord>();
  private cancelled = new Set<string>();

  async init(): Promise<void> {
    await mkdir(uploadsDir, { recursive: true });
    await mkdir(ingestionsDir, { recursive: true });
    await loadPersistedIngestions(this.ingestions);
  }

  publicIngestion(record: IngestionRecord): PublicIngestion {
    return {
      id: record.id,
      status: record.status,
      error: record.error,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  get(ownerId: string, id: string): IngestionRecord | null {
    const record = this.ingestions.get(id);
    if (!record || record.ownerId !== ownerId) return null;
    return record;
  }

  async getTranscriptText(ownerId: string, id: string): Promise<string | null> {
    const record = this.get(ownerId, id);
    if (!record) return null;
    if (record.status !== "ready" || !record.transcriptPath) return null;
    return await readFile(record.transcriptPath, "utf-8");
  }

  async delete(id: string): Promise<void> {
    this.cancelled.add(id);
    const record = this.ingestions.get(id);
    this.ingestions.delete(id);
    await safeUnlink(ingestionRecordPath(id));
    await safeUnlink(record?.transcriptPath ?? ingestionTranscriptPath(id));
    await safeUnlink(record?.audioPath);
  }

  async deleteAllForOwner(ownerId: string): Promise<void> {
    const toDelete: string[] = [];
    for (const [existingId, existing] of this.ingestions.entries()) {
      if (existing.ownerId === ownerId) toDelete.push(existingId);
    }
    for (const existingId of toDelete) await this.delete(existingId);
  }

  async createFromUpload(params: {
    ownerId: string;
    audio: Express.Multer.File;
    queryExpansions: QueryExpansionsConfig | null;
  }): Promise<IngestionRecord> {
    const id = randomUUID();
    const now = nowMs();

    const record: IngestionRecord = {
      id,
      ownerId: params.ownerId,
      audioPath: params.audio.path,
      audioOriginalName: params.audio.originalname,
      audioMimeType: params.audio.mimetype,
      transcriptPath: null,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      error: null,
      ask: null,
    };

    this.ingestions.set(id, record);
    await persistIngestionRecord(record);

    queueMicrotask(async () => {
      const r = this.ingestions.get(id);
      if (!r) return;
      if (this.cancelled.has(id)) return;

      r.status = "processing";
      r.updatedAt = nowMs();
      if (!this.cancelled.has(id)) await persistIngestionRecord(r);

      try {
        logLine("stdout", {
          at: "ingestions.processing.start",
          id,
          msSinceCreate: nowMs() - r.createdAt,
        });

        // If a video file was uploaded, extract its audio track first and then
        // proceed with the existing audio-only pipeline.
        if (isVideoMimeType(r.audioMimeType)) {
          const extractedPath = join(uploadsDir, `${id}.mp3`);
          try {
            await extractAudioToMp3({
              inputPath: r.audioPath,
              outputPath: extractedPath,
            });
          } catch (e: unknown) {
            if (isFfmpegMissingError(e)) {
              throw new Error(
                "ffmpeg is not installed. Install ffmpeg to process video uploads.",
              );
            }
            throw e;
          }

          // Replace the stored path/mimetype to the extracted audio for the rest
          // of the pipeline and for future restarts.
          await safeUnlink(r.audioPath);
          r.audioPath = extractedPath;
          r.audioMimeType = "audio/mpeg";
          r.updatedAt = nowMs();
          if (!this.cancelled.has(id)) await persistIngestionRecord(r);
        }

        const audioBuffer = await readFile(r.audioPath);
        const session = await createRagFromAudioBuffer({
          audioBuffer,
          audioSource: r.audioOriginalName,
          audioFileName: r.audioOriginalName,
          audioMimeType: r.audioMimeType,
          queryExpansions: params.queryExpansions,
        });

        // If user uploaded a new file during processing, don't write anything.
        if (this.cancelled.has(id) || !this.ingestions.get(id)) return;

        const transcriptPath = join(ingestionsDir, `${id}.txt`);
        await writeFile(transcriptPath, session.transcriptText ?? "", "utf-8");
        r.transcriptPath = transcriptPath;

        r.ask = session.ask;
        r.status = "ready";
        r.updatedAt = nowMs();
        if (!this.cancelled.has(id) && this.ingestions.get(id))
          await persistIngestionRecord(r);
        logLine("stdout", {
          at: "ingestions.processing.ready",
          id,
          msTotal: r.updatedAt - r.createdAt,
          chunks: Array.isArray(session.chunks) ? session.chunks.length : null,
        });
      } catch (e: unknown) {
        r.ask = null;
        r.status = "error";
        const details = errorDetails(e);
        r.error = isProd
          ? details.message
          : `${details.name}: ${details.message}`;
        r.updatedAt = nowMs();
        if (!this.cancelled.has(id) && this.ingestions.get(id))
          await persistIngestionRecord(r);
        logLine("stderr", {
          at: "ingestions.processing.error",
          id,
          msTotal: r.updatedAt - r.createdAt,
          error: details,
        });
      }
    });

    return record;
  }

  async createFromUrl(params: {
    ownerId: string;
    url: string;
    queryExpansions: QueryExpansionsConfig | null;
  }): Promise<IngestionRecord> {
    const id = randomUUID();
    const now = nowMs();

    const audioPath = join(uploadsDir, `${id}.mp3`);

    const record: IngestionRecord = {
      id,
      ownerId: params.ownerId,
      audioPath,
      audioOriginalName: params.url,
      audioMimeType: "audio/mpeg",
      transcriptPath: null,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      error: null,
      ask: null,
    };

    this.ingestions.set(id, record);
    await persistIngestionRecord(record);

    queueMicrotask(async () => {
      const r = this.ingestions.get(id);
      if (!r) return;
      if (this.cancelled.has(id)) return;

      r.status = "processing";
      r.updatedAt = nowMs();
      if (!this.cancelled.has(id)) await persistIngestionRecord(r);

      try {
        logLine("stdout", {
          at: "ingestions.processing.start",
          id,
          msSinceCreate: nowMs() - r.createdAt,
        });

        try {
          await downloadYoutubeAudioToMp3({
            url: params.url,
            outputPath: r.audioPath,
          });
        } catch (e: unknown) {
          if (isYtDlpMissingError(e)) {
            throw new Error(
              "yt-dlp is not installed. Install yt-dlp (and ffmpeg) to process YouTube links.",
            );
          }
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("HTTP Error 403")) {
            throw new Error(
              "YouTube download failed (HTTP 403). Try updating yt-dlp to the latest version or retry later.",
            );
          }
          throw e;
        }

        const audioBuffer = await readFile(r.audioPath);
        const session = await createRagFromAudioBuffer({
          audioBuffer,
          audioSource: params.url,
          audioFileName: `${id}.mp3`,
          audioMimeType: r.audioMimeType,
          queryExpansions: params.queryExpansions,
        });

        if (this.cancelled.has(id) || !this.ingestions.get(id)) return;

        const transcriptPath = join(ingestionsDir, `${id}.txt`);
        await writeFile(transcriptPath, session.transcriptText ?? "", "utf-8");
        r.transcriptPath = transcriptPath;

        r.ask = session.ask;
        r.status = "ready";
        r.updatedAt = nowMs();
        if (!this.cancelled.has(id) && this.ingestions.get(id))
          await persistIngestionRecord(r);
        logLine("stdout", {
          at: "ingestions.processing.ready",
          id,
          msTotal: r.updatedAt - r.createdAt,
          chunks: Array.isArray(session.chunks) ? session.chunks.length : null,
        });
      } catch (e: unknown) {
        r.ask = null;
        r.status = "error";
        const details = errorDetails(e);
        r.error = isProd
          ? details.message
          : `${details.name}: ${details.message}`;
        r.updatedAt = nowMs();
        if (!this.cancelled.has(id) && this.ingestions.get(id))
          await persistIngestionRecord(r);
        logLine("stderr", {
          at: "ingestions.processing.error",
          id,
          msTotal: r.updatedAt - r.createdAt,
          error: details,
        });
      }
    });

    return record;
  }

  async ask(
    ownerId: string,
    id: string,
    question: string,
  ): Promise<AskResult | null> {
    const record = this.get(ownerId, id);
    if (!record) return null;
    if (record.status !== "ready") return null;

    // Fast path: reuse in-memory closure (same process lifetime).
    if (record.ask) return await record.ask(question);

    // After a server restart, we don't persist function closures.
    // Recreate an ask function from the persisted transcript on demand.
    if (!record.transcriptPath) return null;
    const transcriptText = await readFile(record.transcriptPath, "utf-8");
    const session = await createRagFromTranscriptText({
      transcriptText,
      transcriptSource: record.audioOriginalName,
      queryExpansions: null,
    });
    const ask = session.ask;
    record.ask = ask;
    return await ask(question);
  }
}
