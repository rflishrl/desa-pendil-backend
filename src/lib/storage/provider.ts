import { getR2Provider } from "@/lib/storage/r2";
import type { StorageProvider } from "@/lib/storage/types";

export type StorageProviderKind = "r2";

/** Returns the active upload storage provider (Cloudflare R2). */
export function getStorageProviderKind(): StorageProviderKind {
  return "r2";
}

/** Returns true when uploads are routed to Cloudflare R2. */
export function isR2ProviderEnabled(): boolean {
  return true;
}

/** Returns the R2 storage provider instance. */
export function getR2Storage(): StorageProvider {
  return getR2Provider();
}
