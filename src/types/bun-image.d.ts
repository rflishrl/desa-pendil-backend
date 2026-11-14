declare namespace Bun {
  export const version: string;

  export interface ImageConstructorOptions {
    autoOrient?: boolean;
    maxPixels?: number;
  }

  export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    hasAlpha?: boolean;
    orientation?: number;
  }

  export interface ImageResizeOptions {
    fit?: "fill" | "inside";
    withoutEnlargement?: boolean;
    filter?:
      | "nearest"
      | "box"
      | "bilinear"
      | "cubic"
      | "mitchell"
      | "lanczos2"
      | "lanczos3"
      | "mks2013"
      | "mks2021";
  }

  export interface ImageEncodeOptions {
    quality?: number;
  }

  export class Image {
    constructor(
      input: ArrayBuffer | ArrayBufferView | Blob | string,
      options?: ImageConstructorOptions,
    );
    metadata(): Promise<ImageMetadata>;
    resize(width?: number, height?: number, options?: ImageResizeOptions): Image;
    webp(options?: ImageEncodeOptions): Image;
    jpeg(options?: ImageEncodeOptions): Image;
    png(options?: ImageEncodeOptions): Image;
    bytes(): Promise<Uint8Array<ArrayBuffer>>;
  }
}
