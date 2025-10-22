import { NextResponse } from "next/server";
import ffmpegStatic from "ffmpeg-static";
import ffmpegImport from "fluent-ffmpeg";

const ffmpeg = ffmpegImport as typeof import("fluent-ffmpeg") & {
  setFfmpegPath?: (path: string) => void;
};

// Set ffmpeg path only if ffmpegStatic is a string
if (ffmpeg.setFfmpegPath && typeof ffmpegStatic === "string") {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const runtime = "nodejs";

export async function GET() {
  try {
    // Verify ffmpeg path is set
    const isAvailable = typeof ffmpegStatic === "string" && ffmpegStatic.length > 0;
    
    return NextResponse.json({ 
      ffmpegPath: ffmpegStatic, 
      message: isAvailable ? "FFmpeg is available" : "FFmpeg not found",
      available: isAvailable
    });
  } catch (error) {
    console.error("FFmpeg test failed:", error);
    return NextResponse.json({ 
      error: "FFmpeg test failed",
      message: error instanceof Error ? error.message : "Unknown error",
      available: false 
    }, { status: 500 });
  }
}