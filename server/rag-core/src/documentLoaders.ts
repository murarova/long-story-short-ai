import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, extname } from "path";
import { Document } from "@langchain/core/documents";
import { chunkDocuments } from "./chunking.js";
import { buildAudioMetadata, transcribeFileToText } from "./transcription.js";

interface TranscriptionData {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  model_name: string;
}

export type IngestSourcesOptions = {
  audioPath: string;
  transcriptCachePath?: string | null;
  forceAudioRecompute?: boolean;
};

export type IngestSourcesBuffersOptions = {
  audioBuffer: Uint8Array;
  audioSource?: string;
  audioFileName?: string;
  audioMimeType?: string;
  forceAudioRecompute?: boolean;
};

function inferAudioMimeTypeFromPath(audioPath: string): string {
  const ext = extname(audioPath).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".mp4") return "audio/mp4";
  if (ext === ".webm") return "audio/webm";
  if (ext === ".ogg") return "audio/ogg";
  return "application/octet-stream";
}

export async function transcribeAudioToDocument(
  audioPath: string,
  cachePath?: string | null,
  forceRecompute: boolean = false
): Promise<Document[]> {
  let transcriptionData: TranscriptionData | null = null;

  if (!forceRecompute && cachePath && existsSync(cachePath)) {
    const cachedContent = readFileSync(cachePath, "utf-8");
    transcriptionData = JSON.parse(cachedContent);
  } else {
    const audioFile = readFileSync(audioPath);

    const fileName = basename(audioPath) || "audio";
    const mimeType = inferAudioMimeTypeFromPath(audioPath);

    const result = await transcribeFileToText(
      audioFile,
      fileName,
      mimeType,
      audioPath,
      "whisper-1"
    );

    transcriptionData = {
      text: result.text,
      segments: [],
      model_name: result.model,
    };

    if (cachePath) {
      mkdirSync(cachePath.substring(0, cachePath.lastIndexOf("/")), {
        recursive: true,
      });
      writeFileSync(
        cachePath,
        JSON.stringify(transcriptionData, null, 2),
        "utf-8"
      );
    }
  }

  const transcriptText = transcriptionData?.text.trim() ?? "";
  const segments = transcriptionData?.segments || [];

  const metadata = buildAudioMetadata({
    source: audioPath,
    whisperModel: transcriptionData?.model_name || "whisper-1",
    cachePath,
    segments,
  });

  return [new Document({ pageContent: transcriptText, metadata })];
}

export async function transcribeAudioBufferToDocument(
  audioBuffer: Uint8Array,
  options?: {
    audioSource?: string;
    fileName?: string;
    mimeType?: string;
  }
): Promise<Document[]> {
  const fileName = options?.fileName || "audio";
  const mimeType = options?.mimeType || "application/octet-stream";
  const source = options?.audioSource || fileName;
  const result = await transcribeFileToText(
    Buffer.from(audioBuffer),
    fileName,
    mimeType,
    source,
    "whisper-1"
  );

  const transcriptText = result.text;
  const metadata = buildAudioMetadata({
    source,
    whisperModel: result.model,
  });

  return [new Document({ pageContent: transcriptText, metadata })];
}

export async function ingestAudioFromPath(
  options: IngestSourcesOptions
): Promise<Document[]> {
  const { audioPath, transcriptCachePath, forceAudioRecompute } = options;
  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found at ${audioPath}`);
  }

  const audioDocs = await transcribeAudioToDocument(
    audioPath,
    transcriptCachePath,
    forceAudioRecompute ?? false
  );

  return [...audioDocs];
}

export async function ingestAudioFromBuffer(
  options: IngestSourcesBuffersOptions
): Promise<Document[]> {
  const audioDocs = await transcribeAudioBufferToDocument(options.audioBuffer, {
    audioSource: options.audioSource || options.audioFileName || "audio",
    fileName: options.audioFileName || "audio",
    mimeType: options.audioMimeType || "application/octet-stream",
  });

  return [...audioDocs];
}

export { chunkDocuments };

export const ingestSources = ingestAudioFromPath;
export const ingestSourcesFromBuffers = ingestAudioFromBuffer;
