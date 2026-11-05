import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

/**
 * Next.js 16 Proxy for admin and login routes.
 * Redirects authenticated admins away from /login,
 * and unauthenticated visitors to /login when attempting to access /admin.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const actor = token ? verifySessionToken(token) : null;
  const isAdmin = actor?.role === "admin";
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
