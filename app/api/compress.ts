import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import formidable from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import { default as ZstdCodecMod } from "zstd‑codec";  // adjust for import style

export const config = {
  api: {
    bodyParser: false,
  },
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

    // Optional: process embedded content, images/fonts etc.
    const processedPath = await processEmbeddedContent(origPath, ext);

    const rawBuffer = await fs.readFile(processedPath);

    // run zstd codec
    ZstdCodecMod.ZstdCodec.run((zstd: any) => {
      const simple = new zstd.Simple();
      const compressionLevel = 3;  // you can make this configurable
      const compressedUint8 = simple.compress(new Uint8Array(rawBuffer), compressionLevel);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${origName}.zst"`);
      res.send(Buffer.from(compressedUint8));
    });
  });
}

// Function to optionally reduce embedded content size
async function processEmbeddedContent(filePath: string, ext: string): Promise<string> {
  // For images: compress via sharp (for example)
  if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    const sharp = (await import("sharp")).default;
    const output = path.join(tmpdir(), `proc_${Date.now()}${ext}`);
    await sharp(filePath)
      .resize({ width: 1280 })        // scale down
      .toFormat("jpeg", { quality: 70 })  // convert to jpeg, reduce quality
      .toFile(output);
    return output;
  }

  // For .docx, .pdf etc: you could add logic to strip heavy fonts/images.
  // For now, return unchanged.
  return filePath;
}
