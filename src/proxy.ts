import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (Next.js 16) refreshes the Supabase session.
 * Authentication and role checks remain enforced in the admin layout and withApi(),
 * ensuring the proxy is not the single point of access control.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only paths requiring session management; route handlers manage cookies independently.
  matcher: ["/admin/:path*", "/login"],
};
