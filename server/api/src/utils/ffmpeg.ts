import { spawn } from "child_process";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

export async function extractAudioToMp3(params: {
  inputPath: string;
  outputPath: string;
}): Promise<void> {
  // Re-encode to MP3 for broad compatibility with transcription providers.
  // -vn: drop video
  // -ac 1: mono
  // -ar 16000: 16kHz (good for speech)
  // -b:a 64k: small bitrate (speech)
  await run("ffmpeg", [
    "-y",
    "-i",
    params.inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "64k",
    params.outputPath,
  ]);
}

export function isFfmpegMissingError(e: unknown): boolean {
  // spawn() throws ENOENT when the binary isn't found.
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "ENOENT"
  );
}
