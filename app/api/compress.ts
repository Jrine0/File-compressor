import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import formidable from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import ZstdCodecMod from "zstd-codec";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Type definition for zstd codec
type ZstdCodec = {
  Simple: new () => {
    compress: (input: Uint8Array, level: number) => Uint8Array;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = new formidable.IncomingForm({ uploadDir: tmpdir(), keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: "Failed to parse file" });
      return;
    }

    const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!fileObj) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const origPath = fileObj.filepath;
    const origName = fileObj.originalFilename || "file";
    const ext = path.extname(origName).toLowerCase();

    // Optionally process embedded content (like images) to reduce size
    const processedPath = await processEmbeddedContent(origPath, ext);
    const rawBuffer = await fs.readFile(processedPath);

    // Run zstd codec with proper typing
    ZstdCodecMod.run((zstd: unknown) => {
      const codec = zstd as ZstdCodec;
      const simple = new codec.Simple();
      const compressionLevel = 3; // Adjust compression level as needed (1-22)
      const compressedUint8 = simple.compress(new Uint8Array(rawBuffer), compressionLevel);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${origName}.zst"`);
      res.send(Buffer.from(compressedUint8));
    });
  });
}

// Function to optionally reduce embedded content size before compression
async function processEmbeddedContent(filePath: string, ext: string): Promise<string> {
  if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    const sharp = (await import("sharp")).default;
    const output = path.join(tmpdir(), `proc_${Date.now()}${ext}`);
    await sharp(filePath)
      .resize({ width: 1280 }) // Scale down large images
      .toFormat("jpeg", { quality: 70 }) // Convert to JPEG, reduce quality
      .toFile(output);
    return output;
  }

  // For other file types, just return original path
  return filePath;
}