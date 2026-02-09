import { spawn } from "child_process";
import { access } from "fs/promises";

function run(cmd: string, args: string[]): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) return resolve({ stderr });
      reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

export function isYtDlpMissingError(e: unknown): boolean {
  // spawn() throws ENOENT when the binary isn't found.
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "ENOENT"
  );
}

export async function downloadYoutubeAudioToMp3(params: {
  url: string;
  outputPath: string; // must end with .mp3
}): Promise<void> {
  // `-x --audio-format mp3` uses ffmpeg under the hood.
  // Use a template path so yt-dlp controls the extension.
  const template = params.outputPath.endsWith(".mp3")
    ? params.outputPath.replace(/\.mp3$/i, ".%(ext)s")
    : `${params.outputPath}.%(ext)s`;

  const baseArgs = [
    "--no-playlist",
    // Prefer non-web clients to avoid SABR/PO-token issues for the web client.
    "--extractor-args",
    "youtube:player_client=android",
    "-x",
    "--audio-format",
    "mp3",
    "-o",
    template,
    params.url,
  ];

  try {
    await run("yt-dlp", baseArgs);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fallback to iOS client if android hits a 403.
    if (msg.includes("HTTP Error 403")) {
      await run("yt-dlp", [
        "--no-playlist",
        "--extractor-args",
        "youtube:player_client=ios",
        "-x",
        "--audio-format",
        "mp3",
        "-o",
        template,
        params.url,
      ]);
    } else {
      throw e;
    }
  }

  // Ensure the mp3 actually exists at the expected location.
  await access(params.outputPath);
}
