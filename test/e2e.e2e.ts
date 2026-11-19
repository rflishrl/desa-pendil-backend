import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const CAPTURE_AFTER = process.env.CAPTURE_AFTER === '1';
const AFTER_DIR = join(process.cwd(), '.baseline-screenshots', 'after');

if (CAPTURE_AFTER) {
	mkdirSync(AFTER_DIR, { recursive: true });
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
	await page.waitForTimeout(800);

	if (CAPTURE_AFTER) {
		await page.screenshot({ path: join(AFTER_DIR, 'login-desktop.png'), fullPage: true });
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: join(AFTER_DIR, 'login-mobile.png'), fullPage: true });
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
