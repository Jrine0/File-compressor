"use client";
import { useState, useRef, useCallback, useMemo } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [compressed, setCompressed] = useState<string | null>(null);
  const [compressionHistory, setCompressionHistory] = useState<
    { name: string; url: string; size: number; type: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [compressionMode, setCompressionMode] = useState<"quality" | "max">("quality");
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", compressionMode);

    const res = await fetch("/api/compress", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert("Compression failed");
      setLoading(false);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    setCompressed(url);
    setCompressionHistory((prev) => [
      { name: file.name, url, size: blob.size, type: file.type },
      ...prev,
    ]);
    setLoading(false);
  };

  const handleClear = () => {
    setFile(null);
    setCompressed(null);
  };

  const formatSize = (size: number) =>
    size > 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(2)} MB`
      : `${(size / 1024).toFixed(2)} KB`;

  const estimatedSizes = useMemo(() => {
    if (!file) return null;

    const originalSize = file.size;
    const type = file.type || "application/octet-stream";
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    const ratios: Record<string, { quality: number; max: number }> = {
      image: { quality: 0.9, max: 0.5 },
      video: { quality: 0.7, max: 0.4 },
      audio: { quality: 0.8, max: 0.4 },
      text: { quality: 0.7, max: 0.4 },
      office: { quality: 0.85, max: 0.5 },
      pdf: { quality: 0.85, max: 0.5 },
      zip: { quality: 0.85, max: 0.5 },
      other: { quality: 0.9, max: 0.6 },
    };

    let category = "other";
    if (type.startsWith("image")) category = "image";
    else if (type.startsWith("video")) category = "video";
    else if (type.startsWith("audio")) category = "audio";
    else if (type.startsWith("text") || type.includes("json") || type.includes("html") || type.includes("javascript"))
      category = "text";
    else if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "mdb", "accdb"].includes(ext)) category = "office";
    else if (ext === "pdf") category = "pdf";
    else if (ext === "zip") category = "zip";

    const ratio = ratios[category] || ratios.other;

    return {
      highQuality: originalSize * ratio.quality,
      maxCompression: originalSize * ratio.max,
    };
  }, [file]);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 flex flex-col items-center pb-32">
      <div
        className={`w-full max-w-6xl flex-grow flex ${
          file ? "flex-row" : "flex-col items-center justify-center"
        } gap-8 transition-all duration-500`}
      >
        <div className={`flex flex-col items-center ${file ? "w-1/2" : "w-full"}`}>
          {/* Dropzone */}
          <div
            className={`flex flex-col items-center justify-center bg-gray-800 rounded-lg p-6 ${
              file ? "h-80" : "h-96"
            } w-full border-4 border-dashed transition-all duration-500 cursor-pointer`}
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <p className="text-xl text-center">{file ? file.name : "Drag & Drop File Here"}</p>
            <p className="text-sm text-gray-400 mt-2">or click to select a file</p>
            <input
              id="fileInput"
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Compression Mode Selector */}
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="compressionMode"
                value="quality"
                checked={compressionMode === "quality"}
                onChange={() => setCompressionMode("quality")}
                className="accent-green-500"
              />
              High Quality
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="compressionMode"
                value="max"
                checked={compressionMode === "max"}
                onChange={() => setCompressionMode("max")}
                className="accent-red-500"
              />
              Maximum Compression
            </label>
          </div>

          {/* Estimated Sizes */}
          {estimatedSizes && (
            <div className="mt-2 text-gray-300 text-sm text-center">
              <p>Estimated Size (High Quality): {formatSize(estimatedSizes.highQuality)}</p>
              <p>Estimated Size (Max Compression): {formatSize(estimatedSizes.maxCompression)}</p>
            </div>
          )}

          {/* Compress Button */}
          {file && (
            <button
              onClick={handleCompress}
              disabled={loading}
              className="mt-4 bg-blue-600 hover:bg-blue-500 py-2 px-6 rounded"
            >
              {loading ? "Compressing..." : "Compress File"}
            </button>
          )}

          {/* Download Button */}
          {compressed && (
            <div className="mt-4 bg-blue-600 hover:bg-blue-500 py-2 px-6 rounded">
              <a
                href={compressed}
                download={`compressed-${file?.name}`}
                className="block text-center"
              >
                Download Compressed File
              </a>
            </div>
          )}
        </div>

        {/* File Info */}
        {file && (
          <div className="w-1/2 bg-gray-900 p-6 rounded-lg flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">File Info</h2>
              <button
                onClick={handleClear}
                className="text-sm bg-red-600 hover:bg-red-500 px-3 py-1 rounded"
              >
                Clear Page
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <div><strong>File Name:</strong> {file.name}</div>
              <div><strong>File Type:</strong> {file.type || "Unknown Type"}</div>
              <div><strong>File Size:</strong> {formatSize(file.size)}</div>
              <div>
                <strong>Last Modified:</strong>{" "}
                {file.lastModified ? new Date(file.lastModified).toLocaleString() : "N/A"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compression History */}
      {compressionHistory.length > 0 && (
        <div className="w-full max-w-6xl mt-12">
          <h2 className="text-xl font-semibold mb-4">Previously Compressed Files</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {compressionHistory.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                download={`compressed-${item.name}`}
                className="min-w-[200px] bg-gray-800 p-4 rounded hover:bg-gray-700 transition-all"
              >
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-gray-400 mt-1">{item.type || "Unknown"}</div>
                <div className="text-xs text-gray-400">{formatSize(item.size)}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
