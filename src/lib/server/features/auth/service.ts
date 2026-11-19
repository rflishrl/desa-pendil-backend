import type { Cookies } from '@sveltejs/kit';

import { type LoginResult, loginSchema } from '#lib/features/auth/schemas.js';
import { AppError } from '#lib/server/api/errors.js';
import { verifyPassword } from '#lib/server/auth/password.js';
import { clearSessionCookie, setSessionCookie } from '#lib/server/auth/session.js';
import { findUserByEmail } from '#lib/server/features/auth/repository.js';

/** Authenticates admin users against Neon admin_users table. */
export async function login(
	rawInput: unknown,
	cookies?: Cookies
): Promise<{ data: LoginResult; setCookieHeader: string }> {
	const { email, password } = loginSchema.parse(rawInput);

	const user = await findUserByEmail(email);
	if (!user || !verifyPassword(password, user.password_hash)) {
		throw new AppError('UNAUTHENTICATED', 'Email atau password salah.');
	}

	if (user.role !== 'admin') {
		throw new AppError('FORBIDDEN', 'Akun ini tidak punya akses admin.');
	}

	const setCookieHeader = await setSessionCookie(user, cookies);
	return { data: { email: user.email }, setCookieHeader };
}

/** Signs out user by deleting the session cookie. */
export async function logout(
	cookies?: Cookies
): Promise<{ data: { loggedOut: true }; setCookieHeader: string }> {
	const setCookieHeader = await clearSessionCookie(cookies);
	return { data: { loggedOut: true }, setCookieHeader };
}
