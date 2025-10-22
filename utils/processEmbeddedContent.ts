import path from "path";
import { promises as fs } from "fs";
import { tmpdir } from "os";

export async function processEmbeddedContent(filePath: string, ext: string, convertLight: boolean): Promise<string> {
  // Example for images - convert large images to smaller jpeg versions
  if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    if (!convertLight) return filePath;

    const sharp = (await import("sharp")).default;
    const output = path.join(tmpdir(), `proc_${Date.now()}${ext}`);
    await sharp(filePath)
      .resize({ width: 1280 })
      .toFormat("jpeg", { quality: 70 })
      .toFile(output);
    return output;
  }

  // Example for PDFs: strip heavy images/fonts (use pdf-lib or similar here)
  if (ext === ".pdf" && convertLight) {
    // TODO: add PDF lightening logic
    // For now, return original
    return filePath;
  }

  // Example for DOCX: unzip, strip media, rezip to smaller docx (requires libraries)
  if (ext === ".docx" && convertLight) {
    // TODO: implement DOCX lighter conversion
    return filePath;
  }

  // Default: return original if no changes
  return filePath;
}
