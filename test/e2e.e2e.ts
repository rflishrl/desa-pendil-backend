import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const CAPTURE_AFTER = process.env.CAPTURE_AFTER === '1';
const CAPTURE_RATELIMIT = process.env.CAPTURE_RATELIMIT === '1' || CAPTURE_AFTER;
const AFTER_DIR = join(process.cwd(), '.baseline-screenshots', 'after');
const RATELIMIT_AFTER_DIR = join(process.cwd(), '.baseline-screenshots', 'ratelimit-after');

if (CAPTURE_AFTER) {
	mkdirSync(AFTER_DIR, { recursive: true });
}
if (CAPTURE_RATELIMIT) {
	mkdirSync(RATELIMIT_AFTER_DIR, { recursive: true });
}

test('public API endpoints return valid JSON envelopes and cache headers', async ({ request }) => {
	const health = await request.get('/api/health');
	expect(health.status()).toBe(200);
	expect(health.headers()['cache-control']).toBe('private, no-store');
	const healthBody = (await health.json()) as { success: boolean; data: { status: string } };
	expect(healthBody.success).toBe(true);
	expect(healthBody.data.status).toBe('ok');

	const news = await request.get('/api/news/v1');
	expect(news.status()).toBe(200);
	expect(news.headers()['cache-control']).toContain('s-maxage=60');
	const newsBody = (await news.json()) as { success: boolean; data: { items: unknown[] } };
	expect(newsBody.success).toBe(true);
	expect(Array.isArray(newsBody.data.items)).toBe(true);

	const gallery = await request.get('/api/gallery/v1');
	expect(gallery.status()).toBe(200);
	expect(gallery.headers()['cache-control']).toContain('s-maxage=60');

	const unauthAdmin = await request.get('/api/admin/storage');
	expect(unauthAdmin.status()).toBe(401);
});

test('unauthenticated redirect, 404, login flow, and all admin pages render cleanly', async ({
	page
}) => {
	test.setTimeout(90_000);
	const consoleErrors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});
	page.on('pageerror', (err) => consoleErrors.push(err.message));

	// Unauthenticated redirect from /admin -> /login
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/admin', { waitUntil: 'load' });
	await page.waitForURL('**/login', { timeout: 15_000 });
	await expect(page.getByRole('heading', { name: /Desa Pendil/i })).toBeVisible();

	const loginForm = page.locator('form');
	const honeypot = loginForm.locator('input[name="website"]');
	await expect(honeypot).toHaveCount(1);
	await expect(honeypot).toHaveAttribute('aria-hidden', 'true');
	await expect(honeypot).toHaveAttribute('tabindex', '-1');
	await expect(honeypot).toHaveAttribute('autocomplete', 'off');
	expect(await honeypot.getAttribute('type')).not.toBe('hidden');
	await expect(loginForm.locator('.cf-turnstile')).toHaveCount(1);

	await page.waitForTimeout(800);

	if (CAPTURE_RATELIMIT) {
		await page.screenshot({ path: join(RATELIMIT_AFTER_DIR, 'login-desktop.png'), fullPage: true });
		if (CAPTURE_AFTER) {
			await page.screenshot({ path: join(AFTER_DIR, 'login-desktop.png'), fullPage: true });
		}
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: join(RATELIMIT_AFTER_DIR, 'login-mobile.png'), fullPage: true });
		if (CAPTURE_AFTER) {
			await page.screenshot({ path: join(AFTER_DIR, 'login-mobile.png'), fullPage: true });
		}
	}

	// Sign in via /login with Turnstile dummy widget
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/login', { waitUntil: 'load' });
	await page.fill('#login-email', 'admin@desapendil.com');
	await page.fill('#login-password', 'admin1234');
	const submitBtn = page.getByRole('button', { name: 'Masuk' });
	await expect(submitBtn).toBeEnabled({ timeout: 25_000 });
	await submitBtn.click();

	await page.waitForURL('**/admin', { timeout: 15_000 });
	await page.waitForLoadState('load');
	await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

	const adminPages: Array<{ name: string; path: string; heading: RegExp }> = [
		{ name: 'admin-dashboard', path: '/admin', heading: /^Dashboard$/ },
		{ name: 'admin-storage', path: '/admin/storage', heading: /Penyimpanan Media R2/i },
		{ name: 'admin-articles', path: '/admin/articles', heading: /^Konten$/ },
		{ name: 'admin-articles-new', path: '/admin/articles/new', heading: /Tambah konten/i },
		{ name: 'admin-gallery', path: '/admin/gallery', heading: /^Galeri$/ },
		{ name: 'admin-gallery-new', path: '/admin/gallery/new', heading: /Unggah foto/i }
	];

	for (const item of adminPages) {
		await page.setViewportSize({ width: 1440, height: 900 });
		const res = await page.goto(item.path, { waitUntil: 'load' });
		expect(res?.status()).toBe(200);
		await expect(page.getByRole('heading', { name: item.heading })).toBeVisible();
		await page.waitForTimeout(200);
		if (CAPTURE_AFTER) {
			await page.screenshot({ path: join(AFTER_DIR, `${item.name}-desktop.png`), fullPage: true });
		}

		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(150);
		if (CAPTURE_AFTER) {
			await page.screenshot({ path: join(AFTER_DIR, `${item.name}-mobile.png`), fullPage: true });
		}
	}

	// Mobile drawer opens and closes
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/admin', { waitUntil: 'load' });
	await page.getByRole('button', { name: 'Buka menu navigasi' }).click();
	const drawer = page.locator('dialog[aria-label="Navigasi Panel Admin"]');
	await expect(drawer).toBeVisible();
	await page.getByRole('button', { name: 'Tutup menu navigasi' }).click();
	await expect(drawer).toBeHidden();

	expect(consoleErrors).toEqual([]);

	// Verify alert feedback on invalid login input & server rejection (checked after consoleErrors)
	await page.context().clearCookies();
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/login', { waitUntil: 'load' });
	await page.fill('#login-email', 'bukan-email');
	await page.fill('#login-password', 'admin1234');
	await expect(submitBtn).toBeEnabled({ timeout: 25_000 });
	await submitBtn.click();
	await expect(page.locator('#login-email-error[role="alert"]')).toBeVisible();

	// 404 route (checked after consoleErrors assertion since browser logs 404 resource status)
	await page.setViewportSize({ width: 1440, height: 900 });
	const res404 = await page.goto('/halaman-tidak-ada-404', { waitUntil: 'load' });
	expect(res404?.status()).toBe(404);
	await expect(page.getByRole('heading', { name: /Halaman tidak ditemukan/i })).toBeVisible();
	if (CAPTURE_AFTER) {
		await page.screenshot({ path: join(AFTER_DIR, 'not-found-desktop.png'), fullPage: true });
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: join(AFTER_DIR, 'not-found-mobile.png'), fullPage: true });
	}
});

test('rate limiter enforces live 429 on 6th login attempt and honeypot short-circuits against PostgreSQL', async ({
	request
}) => {
	const burstEmail = `e2e-burst-${Date.now()}@example.invalid`;
	const headers = {
		origin: 'http://127.0.0.1:4176',
		'x-real-ip': '203.0.113.42'
	};

	// Honeypot filled -> 200 silent accept without hitting rate limiter or Turnstile
	const honeypotRes = await request.post('/api/auth/login', {
		headers,
		data: {
			email: burstEmail,
			password: 'wrong-password',
			turnstileToken: 'invalid-burst-token',
			website: 'https://spam-bot.invalid'
		}
	});
	expect(honeypotRes.status()).toBe(200);
	expect(await honeypotRes.json()).toEqual({
		success: true,
		data: { email: burstEmail }
	});

	// Attempts 1..5 consume live Neon PostgreSQL rate_limits slots before Turnstile (422) or auth (401) rejection
	for (let attempt = 1; attempt <= 5; attempt++) {
		const res = await request.post('/api/auth/login', {
			headers,
			data: {
				email: burstEmail,
				password: 'wrong-password',
				turnstileToken: `invalid-burst-token-${attempt}`
			}
		});
		expect([401, 422]).toContain(res.status());
	}

	// 6th attempt triggers live 429 from Neon PostgreSQL with Retry-After header
	const limitedRes = await request.post('/api/auth/login', {
		headers,
		data: {
			email: burstEmail,
			password: 'wrong-password',
			turnstileToken: 'invalid-burst-token-6'
		}
	});
	expect(limitedRes.status()).toBe(429);
	const retryAfter = Number(limitedRes.headers()['retry-after']);
	expect(retryAfter).toBeGreaterThan(0);
	const body = (await limitedRes.json()) as { success: boolean; error: string };
	expect(body.success).toBe(false);
	expect(body.error).toContain('Terlalu banyak percobaan');
});
