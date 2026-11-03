import { after } from "next/server";

import { log } from "@/lib/log";

/** Pengaturan penyegaran, dibaca dari environment saat dipakai (bukan saat build). */
export function readRevalidateConfig(): {
  baseUrl: string | undefined;
  secret: string | undefined;
} {
  return {
    baseUrl: process.env.FRONTEND_URL?.trim().replace(/\/$/, "") || undefined,
    secret: process.env.REVALIDATE_SECRET?.trim() || undefined,
  };
}

export type RevalidateOutcome =
  | { state: "ok"; revalidated: string[] }
  | { state: "not_configured"; missing: string[] }
  | { state: "rejected"; status: number }
  | { state: "unreachable"; reason: string };

/**
 * Memanggil `POST {FRONTEND_URL}/api/revalidate` dan melaporkan apa yang terjadi.
 * Tidak pernah melempar error: kegagalan dikembalikan sebagai hasil, supaya pemanggil
 * (penyimpanan data, atau tombol uji di dashboard) bisa memutuskan sendiri.
 */
export async function sendRevalidate(
  tags: string[],
): Promise<RevalidateOutcome> {
  const { baseUrl, secret } = readRevalidateConfig();
  const missing = [
    ...(baseUrl ? [] : ["FRONTEND_URL"]),
    ...(secret ? [] : ["REVALIDATE_SECRET"]),
  ];
  if (!baseUrl || !secret) return { state: "not_configured", missing };

  try {
    const response = await fetch(`${baseUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { state: "rejected", status: response.status };

    const body = (await response.json().catch(() => null)) as {
      revalidated?: unknown;
    } | null;
    const revalidated = Array.isArray(body?.revalidated)
      ? body.revalidated.filter((tag): tag is string => typeof tag === "string")
      : [];
    return { state: "ok", revalidated };
  } catch (error) {
    return {
      state: "unreachable",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Memberi tahu frontend bahwa data berubah, supaya cache-nya dibuang dan perubahan
 * tampil langsung. Dijalankan setelah respons dikirim, jadi admin tidak menunggu.
 *
 * Butuh `FRONTEND_URL` dan `REVALIDATE_SECRET`. Jika salah satunya kosong, frontend
 * memperbarui datanya saat cache 1 jam habis. Setiap hasilnya dicatat di Logs Vercel
 * (baris `revalidate ...`), dan kegagalan tidak menggagalkan penyimpanan data.
 * Dashboard admin punya tombol "Uji penyegaran" untuk memeriksa pengaturan ini.
 */
export function revalidateFrontend(tags: string[]) {
  const { baseUrl, secret } = readRevalidateConfig();
  if (!baseUrl || !secret) {
    // Tidak diam-diam: tanpa ini, data yang dihapus baru hilang dari situs setelah 1 jam.
    log(
      "warn",
      "revalidate dilewati: FRONTEND_URL atau REVALIDATE_SECRET kosong",
      { tags, hasFrontendUrl: Boolean(baseUrl), hasSecret: Boolean(secret) },
    );
    return;
  }

  after(async () => {
    const outcome = await sendRevalidate(tags);
    switch (outcome.state) {
      case "ok":
        log("info", "revalidate terkirim", {
          tags,
          revalidated: outcome.revalidated,
        });
        break;
      case "rejected":
        log(
          "error",
          `revalidate ditolak: frontend menjawab HTTP ${outcome.status}`,
          {
            tags,
            status: outcome.status,
          },
        );
        break;
      case "unreachable":
        log("error", "revalidate gagal: frontend tidak terjangkau", {
          tags,
          reason: outcome.reason,
        });
        break;
      case "not_configured":
        break;
    }
  });
}
