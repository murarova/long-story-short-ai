import { OpenAI } from "openai";
import { toFile } from "openai/uploads";

export type TranscriptionResult = {
  text: string;
  model: string;
};

export type AudioMetadataOptions = {
  source: string;
  whisperModel: string;
  cachePath?: string | null;
  segments?: Array<{ start: number; end: number; text: string }>;
};

function getOpenAiClient(): OpenAI {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set for audio transcription."
    );
  }
  return new OpenAI({
    apiKey: openaiApiKey,
    maxRetries: 3,
    timeout: 300_000,
  });
}

export async function transcribeFileToText(
  fileBytes: Uint8Array,
  fileName: string,
  mimeType: string | undefined,
  source: string,
  modelName: string = "whisper-1"
): Promise<TranscriptionResult> {
  const openai = getOpenAiClient();
  const file = await toFile(
    fileBytes,
    fileName,
    mimeType ? { type: mimeType } : undefined
  );
  const transcription = await openai.audio.transcriptions.create({
    file: file as any,
    model: modelName,
  });
  return { text: transcription.text.trim(), model: modelName };
}

export function buildAudioMetadata(
  options: AudioMetadataOptions
): Record<string, any> {
  const metadata: Record<string, any> = {
    source: options.source,
    source_type: "audio",
    source_display: "Audio Transcript",
    whisper_model: options.whisperModel,
  };

  const segments = options.segments || [];
  if (segments.length > 0) {
    metadata.segment_count = segments.length;
    metadata.segment_preview = segments[0]?.text || null;
  }
  if (options.cachePath) {
    metadata.transcript_cache_path = options.cachePath;
  }

  return metadata;
}
