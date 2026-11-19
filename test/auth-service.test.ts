import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUserByEmail = vi.fn();
const setSessionCookie = vi.fn();
const clearSessionCookie = vi.fn();

vi.mock('#lib/server/features/auth/repository.js', () => ({
	findUserByEmail: (...args: unknown[]) => findUserByEmail(...args)
}));

vi.mock('#lib/server/auth/session.js', () => ({
	setSessionCookie: (...args: unknown[]) => setSessionCookie(...args),
	clearSessionCookie: (...args: unknown[]) => clearSessionCookie(...args)
}));

import { hashPassword } from '#lib/server/auth/password.js';

const { login, logout } = await import('#lib/server/features/auth/service.js');

const adminPassword = 'secret-password';
const admin = {
	id: 'a1',
	email: 'admin@desa-pendil.id',
	password_hash: hashPassword(adminPassword),
	role: 'admin' as const
};

const user = {
	id: 'u1',
	email: 'user@desa-pendil.id',
	password_hash: hashPassword(adminPassword),
	role: 'user' as const
};

beforeEach(() => {
	findUserByEmail.mockReset();
	setSessionCookie.mockReset().mockResolvedValue('admin_session=tok; Path=/; HttpOnly');
	clearSessionCookie.mockReset().mockResolvedValue('admin_session=; Path=/; Max-Age=0');
});

const validTurnstileToken = 'dummy-turnstile-token';

describe('login: validation', () => {
	it('rejects invalid email format', async () => {
		await expect(
			login({ email: 'not-an-email', password: 'x', turnstileToken: validTurnstileToken })
		).rejects.toMatchObject({
			name: 'ZodError'
		});
		expect(findUserByEmail).not.toHaveBeenCalled();
	});

	it('rejects empty password', async () => {
		await expect(
			login({ email: 'admin@desa-pendil.id', password: '', turnstileToken: validTurnstileToken })
		).rejects.toMatchObject({
			name: 'ZodError'
		});
	});

	it('rejects empty turnstile token', async () => {
		await expect(
			login({ email: 'admin@desa-pendil.id', password: adminPassword, turnstileToken: '' })
		).rejects.toMatchObject({
			name: 'ZodError'
		});
	});

	it('normalizes email whitespace and casing', async () => {
		findUserByEmail.mockResolvedValue(admin);
		await login({
			email: '  Admin@Desa-Pendil.ID ',
			password: adminPassword,
			turnstileToken: validTurnstileToken
		});
		expect(findUserByEmail).toHaveBeenCalledWith('admin@desa-pendil.id');
	});
});

describe('login: authorization', () => {
	it('succeeds with valid admin credentials and sets session cookie', async () => {
		findUserByEmail.mockResolvedValue(admin);
		const result = await login({
			email: admin.email,
			password: adminPassword,
			turnstileToken: validTurnstileToken
		});
		expect(result.data).toEqual({ email: admin.email });
		expect(setSessionCookie).toHaveBeenCalledWith(admin, undefined);
	});

	it('rejects invalid password with UNAUTHENTICATED error', async () => {
		findUserByEmail.mockResolvedValue(admin);
		await expect(
			login({
				email: admin.email,
				password: 'wrong-password',
				turnstileToken: validTurnstileToken
			})
		).rejects.toMatchObject({
			code: 'UNAUTHENTICATED',
			message: 'Email atau password salah.'
		});
		expect(setSessionCookie).not.toHaveBeenCalled();
	});

	it('rejects non-admin role with FORBIDDEN error', async () => {
		findUserByEmail.mockResolvedValue(user);
		await expect(
			login({
				email: user.email,
				password: adminPassword,
				turnstileToken: validTurnstileToken
			})
		).rejects.toMatchObject({
			code: 'FORBIDDEN',
			message: 'Akun ini tidak punya akses admin.'
		});
		expect(setSessionCookie).not.toHaveBeenCalled();
	});
});

describe('logout', () => {
	it('clears session cookie', async () => {
		const result = await logout();
		expect(result.data).toEqual({ loggedOut: true });
		expect(clearSessionCookie).toHaveBeenCalled();
	});
});
