import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import ffmpegImport from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import zlib from "zlib";
import stream from "stream";
import ZstdCodec from "zstd-codec";

// Type definition for ffmpeg with setFfmpegPath method
type FfmpegModule = typeof ffmpegImport & {
  setFfmpegPath: (path: string) => void;
};

const ffmpeg = ffmpegImport as FfmpegModule;

// Set ffmpeg path only if ffmpegStatic is a string
if (typeof ffmpegStatic === "string") {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mode = (formData.get("mode") as "quality" | "max") || "quality";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const type = file.type || "application/octet-stream";
  const ext = path.extname(file.name).toLowerCase();

  const officeExtensions = [
    ".doc", ".docx", ".dot", ".dotx",
    ".xls", ".xlsx", ".xlt", ".xltx",
    ".ppt", ".pptx", ".pot", ".potx",
    ".pps", ".ppsx", ".pub", ".accdb", ".mdb"
  ];

  let compressedBuffer: Buffer | null = null;

  try {
    // IMAGE COMPRESSION
    if (type.startsWith("image/")) {
      const format = ext.replace(".", "");
      const transformer = sharp(buffer);

      if (format === "png") {
        compressedBuffer = await transformer
          .png({ compressionLevel: mode === "max" ? 9 : 6 })
          .toBuffer();
      } else if (format === "webp") {
        compressedBuffer = await transformer
          .webp({ quality: mode === "max" ? 50 : 90 })
          .toBuffer();
      } else {
        compressedBuffer = await transformer
          .jpeg({ quality: mode === "max" ? 50 : 90 })
          .toBuffer();
      }
    }

    // VIDEO or AUDIO COMPRESSION
    else if (type.startsWith("video/") || type.startsWith("audio/")) {
      const tmpDir = os.tmpdir();
      const tmpInput = path.join(tmpDir, `input${ext}`);
      const tmpOutput = path.join(tmpDir, `output${ext}`);

      await fs.promises.writeFile(tmpInput, buffer);

      const isAudio = type.startsWith("audio/");
      const crf = mode === "max" ? 36 : 23;
      const preset = mode === "max" ? "slower" : "veryslow";
      const bitrate = isAudio ? (mode === "max" ? "64k" : "192k") : undefined;

      await new Promise<void>((resolve, reject) => {
        let command = ffmpeg(tmpInput).outputOptions([`-crf ${crf}`, `-preset ${preset}`]);
        if (isAudio && bitrate) {
          command = command.audioBitrate(bitrate);
        }

        command
          .on("error", (error: Error) => reject(error))
          .on("end", () => resolve())
          .save(tmpOutput);
      });

      compressedBuffer = await fs.promises.readFile(tmpOutput);

      // Clean up temp files
      fs.promises.unlink(tmpInput).catch(() => {});
      fs.promises.unlink(tmpOutput).catch(() => {});
    }

    // TEXT / CODE / MARKUP FILES → Brotli compression
    else if (
      [
        "application/json",
        "text/plain",
        "text/html",
        "application/javascript",
        "text/css",
        "text/markdown",
      ].includes(type)
    ) {
      compressedBuffer = await new Promise<Buffer>((resolve, reject) => {
        const brotli = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: mode === "max" ? 11 : 6,
          },
        });

        const chunks: Buffer[] = [];
        const input = new stream.Readable({
          read() {
            this.push(buffer);
            this.push(null);
          },
        });

        input
          .pipe(brotli)
          .on("data", (chunk: Buffer) => chunks.push(chunk))
          .on("end", () => resolve(Buffer.concat(chunks)))
          .on("error", (err: Error) => reject(err));
      });
    }

    // OFFICE / PDF / ARCHIVE / OTHER BINARY FILES → Zstd
    else if (
      [
        "application/pdf",
        "application/zip",
        "application/x-msdownload",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ].includes(type) ||
      officeExtensions.includes(ext)
    ) {
      compressedBuffer = await new Promise<Buffer>((resolve) => {
        ZstdCodec.run((zstd: unknown) => {
          type CodecType = {
            Simple: new () => {
              compress: (input: Uint8Array, level: number) => Uint8Array;
            };
          };
          const codec = zstd as CodecType;
          const simple = new codec.Simple();
          const lvl = mode === "max" ? 20 : 3;
          const result = simple.compress(buffer, lvl);
          resolve(Buffer.from(result));
        });
      });
    }

    // FALLBACK → generic Zstd
    else {
      compressedBuffer = await new Promise<Buffer>((resolve) => {
        ZstdCodec.run((zstd: unknown) => {
          type CodecType = {
            Simple: new () => {
              compress: (input: Uint8Array, level: number) => Uint8Array;
            };
          };
          const codec = zstd as CodecType;
          const simple = new codec.Simple();
          const result = simple.compress(buffer, 3);
          resolve(Buffer.from(result));
        });
      });
    }

    // Return compressed file
    if (!compressedBuffer) {
      return NextResponse.json({ error: "Compression failed" }, { status: 500 });
    }

    return new NextResponse(new Uint8Array(compressedBuffer), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${file.name}"`,
      },
    });
  } catch (error) {
    console.error("Compression failed:", error);
    return NextResponse.json({ error: "Compression failed" }, { status: 500 });
  }
}