import { createHash, timingSafeEqual } from "node:crypto";

/** Perbandingan string dalam waktu tetap (tidak membocorkan panjang atau isi). */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
