import type { RateLimitRule } from "@/lib/api/rate-limit";

/** Aturan rate limit per IP, di satu tempat supaya mudah diatur. */
export const RATE_LIMITS = {
  /** Baca data publik. Tidak ada cache CDN, jadi setiap permintaan dihitung. Frontend hanya memanggil saat menyegarkan cache-nya. */
  publicRead: { name: "public-read", limit: 120, windowSeconds: 60 },
  health: { name: "health", limit: 30, windowSeconds: 60 },
  login: { name: "login", limit: 8, windowSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>;
