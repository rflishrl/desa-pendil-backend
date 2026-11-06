import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import type { Actor } from "@/lib/auth/actor";

export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface SessionPayload {
  sub: string;
  email: string;
  role: "admin" | "user";
  exp: number;
}

function getSecretKey(): string {
  const env = getServerEnv();
  return (
    env.SESSION_SECRET ||
    env.DATABASE_URI ||
    "default-secret-key-32-chars-long!"
  );
}

/** Signs a session token for an authenticated actor. */
export function createSessionToken(actor: Actor): string {
  const payload: SessionPayload = {
    sub: actor.id,
    email: actor.email,
    role: actor.role,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

/** Verifies and parses a signed session token. Returns null if invalid or expired. */
export function verifySessionToken(token: string): Actor | null {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getSecretKey())
    .update(body)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    );
    if (!payload.exp || Date.now() > payload.exp) return null;
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

/** Resolves current authenticated admin from session cookies. */
export async function getCurrentAdmin(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const actor = verifySessionToken(token);
  if (!actor || actor.role !== "admin") return null;
  return actor;
}

/** Sets the httpOnly session cookie for the actor. */
export async function setSessionCookie(actor: Actor): Promise<void> {
  const cookieStore = await cookies();
  const token = createSessionToken(actor);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clears the session cookie on logout. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
