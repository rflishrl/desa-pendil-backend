import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";

// Minimal valid 1x1 transparent PNG sample used solely for runtime Bun.Image verification.
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export interface ImageDiagnosticsResult {
  ok: boolean;
  runtime: "bun" | "node";
  bunVersion: string | null;
  hasBunImage: boolean;
  outputBytes: number;
  durationMs: number;
  error?: string;
}

function isWebpBytes(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

/**
 * Smoke-tests the active JavaScript runtime and native `Bun.Image` WebP encoding
 * so Vercel Preview deployments can confirm `bun1.x` before Fase 3.
 */
export async function runImageDiagnostics(actor: Actor | null): Promise<ImageDiagnosticsResult> {
  assertAdmin(actor);

  const startedAt = performance.now();
  const isBun = typeof Bun !== "undefined";
  const bunVersion = isBun ? Bun.version : null;
  const hasBunImage = isBun && typeof Bun.Image === "function";

  if (!hasBunImage) {
    return {
      ok: false,
      runtime: isBun ? "bun" : "node",
      bunVersion,
      hasBunImage: false,
      outputBytes: 0,
      durationMs: Math.round(performance.now() - startedAt),
      error: "Bun.Image API tidak tersedia pada runtime ini.",
    };
  }

  try {
    const sample = Uint8Array.from(atob(SAMPLE_PNG_BASE64), (c) => c.charCodeAt(0));
    const encoded = await new Bun.Image(sample, { autoOrient: true })
      .resize(1, 1, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .bytes();

    return {
      ok: isWebpBytes(encoded),
      runtime: "bun",
      bunVersion,
      hasBunImage: true,
      outputBytes: encoded.byteLength,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      ok: false,
      runtime: "bun",
      bunVersion,
      hasBunImage: true,
      outputBytes: 0,
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
