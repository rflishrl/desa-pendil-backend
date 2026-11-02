import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/http";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type SessionPayload,
} from "./token";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, getEnv().AUTH_SECRET);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload, getEnv().AUTH_SECRET);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** For pages and server actions: send visitors without a session to the login page. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For route handlers: respond 401 JSON instead of redirecting. */
export async function requireAdminApi(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Unauthorized");
  return session;
}
