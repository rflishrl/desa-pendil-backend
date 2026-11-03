import "server-only";

import type {
  RevalidateCheck,
  RevalidateStatus,
} from "@/features/revalidate/types";
import type { Actor } from "@/lib/auth/actor";
import { assertAdmin } from "@/lib/auth/authorize";
import { readRevalidateConfig, sendRevalidate } from "@/lib/revalidate";

/** Tag yang dipakai untuk uji. Menyegarkan daftar berita tidak berbahaya. */
const TEST_TAGS = ["news"];

/** Pengaturan penyegaran yang dibaca backend sekarang (tanpa nilai rahasia). */
export function getRevalidateStatus(actor: Actor | null): RevalidateStatus {
  assertAdmin(actor);
  const { baseUrl, secret } = readRevalidateConfig();
  return { frontendUrl: baseUrl ?? null, hasSecret: Boolean(secret) };
}

/**
 * Memanggil frontend dari backend, persis seperti saat admin menyimpan data, lalu
 * menerjemahkan jawabannya menjadi kalimat yang menunjuk bagian mana yang salah.
 */
export async function checkRevalidate(
  actor: Actor | null,
): Promise<RevalidateCheck> {
  assertAdmin(actor);
  const { baseUrl } = readRevalidateConfig();
  const outcome = await sendRevalidate(TEST_TAGS);

  switch (outcome.state) {
    case "ok":
      if (outcome.revalidated.length === 0) {
        return {
          state: "error",
          message:
            "Frontend menjawab 200 tapi tidak mengenali tag berita. Pastikan frontend memakai versi terbaru.",
        };
      }
      return {
        state: "ok",
        message:
          "Berhasil. Frontend menerima rahasia dan menyegarkan halaman berita. Penyegaran otomatis siap dipakai.",
      };

    case "not_configured":
      return {
        state: "not_configured",
        message: `Backend belum membaca: ${outcome.missing.join(" dan ")}. Isi di Vercel (project backend, lingkungan Production), lalu Redeploy dan Promote jika berlabel Staged.`,
      };

    case "rejected":
      if (outcome.status === 401) {
        return {
          state: "unauthorized",
          message:
            "Frontend menolak rahasia ini. REVALIDATE_SECRET di backend berbeda dengan di frontend. Samakan nilainya persis, lalu Redeploy keduanya.",
        };
      }
      if (outcome.status === 503) {
        return {
          state: "frontend_missing_secret",
          message:
            "Frontend belum punya REVALIDATE_SECRET. Isi di project frontend, lalu Redeploy frontend.",
        };
      }
      if (outcome.status === 404 || outcome.status === 405) {
        return {
          state: "wrong_address",
          message: `Alamat ${baseUrl} menjawab HTTP ${outcome.status}. Itu bukan frontend, atau alamat FRONTEND_URL salah.`,
        };
      }
      return {
        state: "error",
        message: `Frontend menjawab HTTP ${outcome.status}. Cek Logs project frontend.`,
      };

    case "unreachable":
      return {
        state: "unreachable",
        message: `Tidak bisa menghubungi ${baseUrl}. Periksa FRONTEND_URL. Detail: ${outcome.reason}`,
      };
  }
}
