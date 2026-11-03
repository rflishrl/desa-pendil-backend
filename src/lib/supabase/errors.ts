import type { PostgrestError } from "@supabase/supabase-js";

import { AppError } from "@/lib/api/errors";

/**
 * Menerjemahkan error Supabase/Postgres menjadi AppError. Pesan mentah tidak pernah
 * dikirim ke pemanggil; ia ikut sebagai `cause` dan hanya muncul di log server.
 */
export function toAppError(error: PostgrestError, action: string): AppError {
  const cause = error;
  switch (error.code) {
    case "23505":
      return new AppError("CONFLICT", "Data yang sama sudah ada.", { cause });
    case "23502":
    case "23514":
    case "22001":
    case "22P02":
      return new AppError("VALIDATION", "Data yang dikirim tidak valid.", {
        cause,
      });
    case "42501":
      return new AppError(
        "FORBIDDEN",
        "Anda tidak punya akses untuk tindakan ini.",
        { cause },
      );
    case "PGRST301":
    case "PGRST302":
    case "PGRST303":
      return new AppError("UNAUTHENTICATED", "Sesi Anda sudah berakhir.", {
        cause,
      });
    default:
      return new AppError("INTERNAL", `Gagal ${action}.`, { cause });
  }
}
