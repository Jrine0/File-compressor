declare module "zstd-codec" {
  export default class ZstdCodec {
    static run(callback: (zstd: any) => void): void;
  }
}
