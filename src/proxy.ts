import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (Next.js 16, pengganti middleware) hanya memperbarui sesi Supabase.
 * Pemeriksaan login dan peran tetap dilakukan di layout admin dan di withApi(),
 * karena proxy tidak boleh menjadi satu-satunya penjaga akses.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Hanya halaman yang memakai sesi. Route Handler bisa menulis cookie sendiri.
  matcher: ["/admin/:path*", "/login"],
};
