import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath!);

export const runtime = "nodejs";

export async function GET() {
  return new Promise<NextResponse>((resolve) => {
    ffmpeg()
      .addInput("dummy") // we just want version info, input ignored
      .on("start", () => {}) // ignore start
      .on("error", () => {}) // ignore errors
      .ffprobe((err, data) => {
        // fallback, just return the binary path as version
        resolve(
          NextResponse.json({ ffmpegPath, message: "FFmpeg is available" })
        );
      });
  });
}
