import sharp from "sharp";

export interface CompressImageOptions {
  /**
   * Compression quality (1-100).
   * 85 balances visual fidelity with compression efficiency.
   */
  quality?: number;
  /**
   * Maximum dimension in pixels for width/height.
   */
  maxDimension?: number;
}

export interface UploadedFile {
  data: Buffer;
  mimetype: string;
  name: string;
  size: number;
}

/**
 * Compresses uploaded images using Bun.Image API.
 * Converts compressible formats to WebP at quality 85.
 * Falls back to Sharp when running outside Bun or on failure.
 */
export async function compressUploadedImage(
  file: UploadedFile,
  options: CompressImageOptions = {}
): Promise<UploadedFile> {
  const { quality = 85, maxDimension = 2560 } = options;

  const compressibleMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ];

  if (!file || !file.data || !compressibleMimes.includes(file.mimetype)) {
    return file;
  }

  try {
    let compressedBuffer: Buffer | null = null;
    const targetMime = "image/webp";
    const targetExt = ".webp";

    // 1. Process with Bun.Image when running under Bun
    // @ts-expect-error Bun is available in Bun runtime
    if (typeof Bun !== "undefined" && typeof Bun.Image === "function") {
      try {
        // @ts-expect-error Bun.Image
        const meta = await new Bun.Image(file.data).metadata();
        // @ts-expect-error Bun.Image
        let pipeline = new Bun.Image(file.data);

        if (
          (meta.width && meta.width > maxDimension) ||
          (meta.height && meta.height > maxDimension)
        ) {
          pipeline = pipeline.resize(maxDimension, maxDimension, {
            fit: "inside",
          });
        }

        const rawBytes = await pipeline.webp({ quality }).buffer();
        compressedBuffer = Buffer.from(rawBytes);
      } catch (bunErr) {
        console.warn(
          "Bun.Image pipeline failed, falling back to Sharp:",
          bunErr
        );
      }
    }

    // 2. Fall back to Sharp if Bun.Image is unavailable or failed
    if (!compressedBuffer) {
      compressedBuffer = await sharp(file.data)
        .resize({
          width: maxDimension,
          height: maxDimension,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();
    }

    // Only return compressed buffer if it is smaller than original
    if (compressedBuffer && compressedBuffer.length < file.data.length) {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const newName = `${baseName}${targetExt}`;

      return {
        data: compressedBuffer,
        mimetype: targetMime,
        name: newName,
        size: compressedBuffer.length,
      };
    }
  } catch (err) {
    console.warn("Image compression skipped due to error:", err);
  }

  return file;
}
