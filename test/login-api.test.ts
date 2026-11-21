import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readBody, sameOriginRequest } from './api.js';

const login = vi.fn();
const consumeRateLimit = vi.fn();
const resetRateLimit = vi.fn();
const verifyTurnstile = vi.fn();

vi.mock('#lib/server/features/auth/service.js', () => ({
	login: (...args: unknown[]) => login(...args)
}));

vi.mock('#lib/server/turnstile.js', () => ({
	verifyTurnstile: (...args: unknown[]) => verifyTurnstile(...args)
}));

vi.mock('#lib/server/api/rate-limit.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/server/api/rate-limit.js')>()),
	consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
	resetRateLimit: (...args: unknown[]) => resetRateLimit(...args)
}));

const { POST } = await import('../src/routes/api/auth/login/+server.js');
const { AppError } = await import('#lib/server/api/errors.js');

const admin = {
	email: 'admin@desa-pendil.id'
};

const loginRequest = (json: unknown, headers?: Record<string, string>) =>
	sameOriginRequest('/api/auth/login', {
		method: 'POST',
		json,
		headers: { 'x-real-ip': '1.2.3.4', ...headers }
	});

beforeEach(() => {
	login.mockReset();
	consumeRateLimit.mockReset().mockResolvedValue(undefined);
	resetRateLimit.mockReset().mockResolvedValue(undefined);
	verifyTurnstile.mockReset().mockResolvedValue({ success: true });
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/auth/login', () => {
	it('returns 200 for valid admin login and resets IP+email rate limit', async () => {
		login.mockResolvedValue({
			data: { email: admin.email },
			setCookieHeader: 'admin_session=tok; Path=/; HttpOnly'
		});
		const response = await POST(
			loginRequest({
				email: admin.email,
				password: 'secret-password',
				turnstileToken: 'valid-token'
			})
		);
		expect(response.status).toBe(200);
		expect(await readBody(response)).toEqual({
			success: true,
			data: { email: admin.email }
		});
		expect(verifyTurnstile).toHaveBeenCalledWith({
			token: 'valid-token',
			expectedAction: 'login',
			clientIp: '1.2.3.4'
		});
		expect(consumeRateLimit).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'rl:desa-pendil:login',
				limit: 5,
				windowSeconds: 900
			}),
			`1.2.3.4:${admin.email}`,
			expect.any(String)
		);
		expect(resetRateLimit).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'rl:desa-pendil:login', limit: 5 }),
			`1.2.3.4:${admin.email}`
		);
	});

	it('uses getClientAddress when provided by SvelteKit event', async () => {
		login.mockResolvedValue({
			data: { email: admin.email },
			setCookieHeader: 'admin_session=tok; Path=/; HttpOnly'
		});
		const response = await POST({
			request: loginRequest({
				email: ` ${admin.email.toUpperCase()} `,
				password: 'secret-password',
				turnstileToken: 'valid-token'
			}),
			getClientAddress: () => '9.9.9.9'
		} as never);
		expect(response.status).toBe(200);
		expect(consumeRateLimit).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'rl:desa-pendil:login' }),
			`9.9.9.9:${admin.email}`,
			expect.any(String)
		);
		expect(verifyTurnstile).toHaveBeenCalledWith({
			token: 'valid-token',
			expectedAction: 'login',
			clientIp: '9.9.9.9'
		});
		expect(resetRateLimit).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'rl:desa-pendil:login' }),
			`9.9.9.9:${admin.email}`
		);
	});

	it('returns silent fake success when honeypot website is filled without calling rate limiter, Turnstile, or auth', async () => {
		const response = await POST(
			loginRequest({
				email: admin.email,
				password: 'secret-password',
				turnstileToken: 'valid-token',
				website: 'https://bot-spam.example'
			})
		);
		expect(response.status).toBe(200);
		expect(await readBody(response)).toEqual({
			success: true,
			data: { email: admin.email }
		});
		expect(consumeRateLimit).not.toHaveBeenCalled();
		expect(verifyTurnstile).not.toHaveBeenCalled();
		expect(login).not.toHaveBeenCalled();
	});

	it('rejects invalid input via Zod 4 with 422 before calling Turnstile or login', async () => {
		const response = await POST(
			loginRequest({
				email: 'not-an-email',
				password: 'secret-password',
				turnstileToken: 'valid-token'
			})
		);
		expect(response.status).toBe(422);
		expect(verifyTurnstile).not.toHaveBeenCalled();
		expect(login).not.toHaveBeenCalled();
	});

	it('rejects when Turnstile verification fails with 422', async () => {
		verifyTurnstile.mockResolvedValue({ success: false, error: 'Verifikasi gagal.' });
		const response = await POST(
			loginRequest({
				email: admin.email,
				password: 'secret-password',
				turnstileToken: 'invalid-token'
			})
		);
		expect(response.status).toBe(422);
		expect(await readBody(response)).toEqual({
			success: false,
			error: 'Verifikasi gagal.'
		});
		expect(login).not.toHaveBeenCalled();
		expect(resetRateLimit).not.toHaveBeenCalled();
	});

	it('propagates authentication errors from service when Turnstile passes', async () => {
		login.mockRejectedValue(new AppError('UNAUTHENTICATED', 'Email atau password salah.'));
		const response = await POST(
			loginRequest({
				email: admin.email,
				password: 'wrong-password',
				turnstileToken: 'valid-token'
			})
		);
		expect(response.status).toBe(401);
		expect(await readBody(response)).toEqual({
			success: false,
			error: 'Email atau password salah.'
		});
		expect(resetRateLimit).not.toHaveBeenCalled();
	});

	it('rejects non-json bodies', async () => {
		const request = sameOriginRequest('/api/auth/login', {
			method: 'POST',
			body: 'not-json',
			headers: { 'content-type': 'text/plain' }
		});
		const response = await POST(request);
		expect(response.status).toBe(400);
		expect(await readBody(response)).toEqual({
			success: false,
			error: 'Body must be valid JSON.'
		});
	});

	it('handles rate limiting properly before login processing', async () => {
		consumeRateLimit.mockRejectedValue(
			new AppError('RATE_LIMITED', 'Terlalu banyak permintaan login.', {
				retryAfterSeconds: 600
			})
		);
		const response = await POST(
			loginRequest({
				email: admin.email,
				password: 'secret-password',
				turnstileToken: 'valid-token'
			})
		);
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('600');
		expect(verifyTurnstile).not.toHaveBeenCalled();
		expect(login).not.toHaveBeenCalled();
	});
});
