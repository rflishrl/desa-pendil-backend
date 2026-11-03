import type { Actor } from "@/lib/auth/actor";
import { AppError } from "@/lib/api/errors";

/**
 * Aturan otorisasi lapisan service. Data Desa Pendil tidak punya pemilik per user;
 * semua penulisan milik peran admin. Dicek di sini (bukan hanya di route) supaya
 * service aman dipanggil dari mana pun, dan RLS di database menjadi lapisan kedua.
 */
export function assertAdmin(actor: Actor | null): asserts actor is Actor {
  if (!actor) {
    throw new AppError("UNAUTHENTICATED", "Anda harus login sebagai admin.");
  }
  if (actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "Akun ini bukan admin.");
  }
}
