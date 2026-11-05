import "server-only";

import { findUserByEmail } from "@/features/auth/repository";
import { loginSchema, type LoginResult } from "@/features/auth/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";

/** Authenticates admin users against Neon admin_users table. */
export async function login(rawInput: unknown): Promise<LoginResult> {
  const { email, password } = loginSchema.parse(rawInput);

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new AppError("UNAUTHENTICATED", "Email atau password salah.");
  }

  if (user.role !== "admin") {
    throw new AppError("FORBIDDEN", "Akun ini tidak punya akses admin.");
  }

  await setSessionCookie(user);
  return { email: user.email };
}

/** Signs out user by deleting the session cookie. */
export async function logout(): Promise<{ loggedOut: true }> {
  await clearSessionCookie();
  return { loggedOut: true };
}
