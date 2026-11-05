import type { Actor } from "@/lib/auth/actor";
import { AppError } from "@/lib/api/errors";

/**
 * Service-layer authorization rules.
 * Enforces admin privileges at the service boundary so functions remain secure
 * independently of calling routes, with database RLS providing secondary defense.
 */
export function assertAdmin(actor: Actor | null): asserts actor is Actor {
  if (!actor) {
    throw new AppError("UNAUTHENTICATED", "Anda harus login sebagai admin.");
  }
  if (actor.role !== "admin") {
    throw new AppError("FORBIDDEN", "Akun ini bukan admin.");
  }
}
