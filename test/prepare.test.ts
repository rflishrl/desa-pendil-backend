import { afterEach, describe, expect, it, vi } from 'vitest';

import { CLIENT_MAX_BYTES, prepareImageForUpload } from '#lib/image/prepare.js';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('prepareImageForUpload', () => {
	it('mengembalikan file kecil (<= 3.5 MB) apa adanya tanpa memanggil canvas', async () => {
		const small = new File([new Uint8Array(1024)], 'foto.png', { type: 'image/png' });
		const result = await prepareImageForUpload(small);
		expect(result.didShrink).toBe(false);
		expect(result.file).toBe(small);
	});

	it('mengecilkan file > 3.5 MB ke WebP bila didukung browser', async () => {
		const close = vi.fn();
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn().mockResolvedValue({ width: 5120, height: 2560, close })
		);

		const drawImage = vi.fn();
		const convertToBlob = vi
			.fn()
			.mockResolvedValue(new Blob([new Uint8Array(500_000)], { type: 'image/webp' }));
		class FakeOffscreenCanvas {
			width: number;
			height: number;
			constructor(width: number, height: number) {
				this.width = width;
				this.height = height;
			}
			getContext() {
				return { drawImage };
			}
			convertToBlob = convertToBlob;
		}
		vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

		const big = new File([new Uint8Array(CLIENT_MAX_BYTES + 100_000)], 'kamera.jpg', {
			type: 'image/jpeg'
		});
		const result = await prepareImageForUpload(big);

		expect(result.didShrink).toBe(true);
		expect(result.file.type).toBe('image/webp');
		expect(result.file.name).toBe('kamera.webp');
		expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2560, 1280);
		expect(close).toHaveBeenCalledOnce();
	});

	it('fallback langsung ke JPEG jika browser (Safari/iOS) diam-diam mengembalikan image/png untuk WebP', async () => {
		const close = vi.fn();
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn().mockResolvedValue({ width: 3000, height: 3000, close })
		);

		const convertToBlob = vi
			.fn()
			.mockResolvedValueOnce(
				new Blob([new Uint8Array(CLIENT_MAX_BYTES + 50_000)], { type: 'image/png' })
			)
			.mockResolvedValueOnce(new Blob([new Uint8Array(400_000)], { type: 'image/jpeg' }));
		class SafariLikeOffscreenCanvas {
			getContext() {
				return { drawImage: vi.fn() };
			}
			convertToBlob = convertToBlob;
		}
		vi.stubGlobal('OffscreenCanvas', SafariLikeOffscreenCanvas);

		const big = new File([new Uint8Array(CLIENT_MAX_BYTES + 10_000)], 'iphone.jpg', {
			type: 'image/jpeg'
		});
		const result = await prepareImageForUpload(big);

		expect(result.didShrink).toBe(true);
		expect(result.file.type).toBe('image/jpeg');
		expect(result.file.name).toBe('iphone.jpg');
		expect(convertToBlob).toHaveBeenNthCalledWith(1, { type: 'image/webp', quality: 0.85 });
		expect(convertToBlob).toHaveBeenNthCalledWith(2, { type: 'image/jpeg', quality: 0.85 });
	});

	it('menolak format selain JPEG/PNG/WebP jika melebihi batas', async () => {
		const unsupported = new File([new Uint8Array(CLIENT_MAX_BYTES + 100)], 'anim.gif', {
			type: 'image/gif'
		});
		await expect(prepareImageForUpload(unsupported)).rejects.toThrow(/JPG, PNG, atau WebP/);
	});
});
