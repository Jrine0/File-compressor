// custom.d.ts

declare module "zstd-codec" {
  export class ZstdCodec {
    static run(callback: (zstd: Zstd) => void): void;
  }

  export class Zstd {
    Simple: typeof Simple;
  }

  export class Simple {
    constructor();
    compress(data: Uint8Array | Buffer, level?: number): Uint8Array;
    decompress(data: Uint8Array | Buffer): Uint8Array;
  }
}

declare module "fluent-ffmpeg" {
  import { EventEmitter } from "events";

  interface FFmpegCommand extends EventEmitter {
    output(path: string): FFmpegCommand;
    outputOptions(options: string | string[]): FFmpegCommand;
    audioBitrate(bitrate: string): FFmpegCommand;
    save(path: string): FFmpegCommand;
    on(event: "start" | "progress" | "error" | "end", listener: (...args: any[]) => void): FFmpegCommand;
  }

  function ffmpeg(input?: string | Buffer): FFmpegCommand;

  export = ffmpeg;
}
