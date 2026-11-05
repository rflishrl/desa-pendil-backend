import { cleanupOrphanImages } from "@/features/uploads/cleanup-service";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 60;

/**
 * Dipanggil Vercel Cron setiap hari (lihat vercel.json) untuk menghapus foto yatim di Blob.
 * Tanpa sesi: otorisasinya rahasia CRON_SECRET, diperiksa di service.
 */
export const GET = withApi({ access: "public" }, async ({ request }) => ({
  data: await cleanupOrphanImages(request.headers.get("authorization")),
}));
