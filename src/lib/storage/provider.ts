import { getServerEnv } from "@/lib/env";
import { getR2Provider } from "@/lib/storage/r2";
import type { StorageProvider } from "@/lib/storage/types";

export type StorageProviderKind = "blob" | "r2";

/** Returns the active upload storage provider configured via STORAGE_PROVIDER. */
export function getStorageProviderKind(): StorageProviderKind {
  return getServerEnv().STORAGE_PROVIDER;
}

/** Returns true when uploads are routed to Cloudflare R2. */
export function isR2ProviderEnabled(): boolean {
  return getStorageProviderKind() === "r2";
}

/** Returns the R2 storage provider instance when R2 operations are invoked. */
export function getR2Storage(): StorageProvider {
  return getR2Provider();
}
