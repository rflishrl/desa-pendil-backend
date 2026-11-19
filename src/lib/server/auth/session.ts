import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

import type { Actor } from '#lib/server/auth/actor.js';
import { getServerEnv } from '#lib/server/env.js';

export const SESSION_COOKIE_NAME = 'admin_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface SessionPayload {
	sub: string;
	email: string;
	role: 'admin' | 'user';
	exp: number;
}

function getSecretKey(): string {
	const env = getServerEnv();
	const secret =
		env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? env.DATABASE_URI : undefined);
	if (!secret) {
		throw new Error(
			'SESSION_SECRET belum dikonfigurasi. Harap tentukan SESSION_SECRET minimal 32 karakter.'
		);
	}
	return secret;
}

/** Signs a session token for an authenticated actor. */
export function createSessionToken(actor: Actor): string {
	const payload: SessionPayload = {
		sub: actor.id,
		email: actor.email,
		role: actor.role,
		exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
	};
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const signature = crypto.createHmac('sha256', getSecretKey()).update(body).digest('base64url');
	return `${body}.${signature}`;
}

/** Verifies and parses a signed session token. Returns null if invalid or expired. */
export function verifySessionToken(token: string): Actor | null {
	if (!token || !token.includes('.')) return null;
	const [body, signature] = token.split('.');
	if (!body || !signature) return null;

	let secret: string;
	try {
		secret = getSecretKey();
	} catch {
		return null;
	}

	const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('base64url');

	const sigBuffer = Buffer.from(signature);
	const expBuffer = Buffer.from(expectedSignature);
	if (sigBuffer.length !== expBuffer.length) return null;
	if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;

	try {
		const payload: SessionPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
		if (!payload.exp || Date.now() > payload.exp) return null;
		return { id: payload.sub, email: payload.email, role: payload.role };
	} catch {
		return null;
	}
}

function parseSessionTokenFromRequest(request: Request): string | undefined {
	const cookieHeader = request.headers.get('cookie');
	if (!cookieHeader) return undefined;
	for (const part of cookieHeader.split(';')) {
		const [k, ...v] = part.trim().split('=');
		if (k === SESSION_COOKIE_NAME) {
			return decodeURIComponent(v.join('='));
		}
	}
	return undefined;
}

/** Resolves current authenticated admin from SvelteKit cookies or request headers. */
export async function getCurrentAdmin(request?: Request, cookies?: Cookies): Promise<Actor | null> {
	let token = cookies?.get(SESSION_COOKIE_NAME);
	if (!token && request) {
		token = parseSessionTokenFromRequest(request);
	}
	if (!token) return null;

	const actor = verifySessionToken(token);
	if (!actor || actor.role !== 'admin') return null;
	return actor;
}

export function createSessionCookieHeader(token: string): string {
	const isProd = process.env.NODE_ENV === 'production';
	return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
}

export function clearSessionCookieHeader(): string {
	return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/** Sets the httpOnly session cookie via SvelteKit Cookies and returns the Set-Cookie header value. */
export async function setSessionCookie(actor: Actor, cookies?: Cookies): Promise<string> {
	const token = createSessionToken(actor);
	if (cookies) {
		cookies.set(SESSION_COOKIE_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: SESSION_MAX_AGE_SECONDS
		});
	}
	return createSessionCookieHeader(token);
}

/** Clears the session cookie on logout and returns the clearing Set-Cookie header value. */
export async function clearSessionCookie(cookies?: Cookies): Promise<string> {
	if (cookies) {
		cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	}
	return clearSessionCookieHeader();
}
