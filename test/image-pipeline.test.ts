import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
	FULL_MAX_BYTES,
	FULL_MAX_DIMENSION,
	hasAnimatedWebpMarker,
	processImagePipeline,
	THUMB_MAX_DIMENSION
} from '#lib/server/features/uploads/image-pipeline.js';

const TINY_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
	'base64'
);

async function makeLargePng(width: number, height: number): Promise<Uint8Array> {
	return new Uint8Array(
		await sharp(TINY_PNG).resize(width, height, { fit: 'fill' }).png().toBuffer()
	);
}

function addExifOrientation6(jpegBytes: Uint8Array): Uint8Array {
	const secretText = Buffer.from('SecretCameraEXIF\0');
	const exifPayload = Buffer.from([
		0x45,
		0x78,
		0x69,
		0x66,
		0x00,
		0x00,
		0x49,
		0x49,
		0x2a,
		0x00,
		0x08,
		0x00,
		0x00,
		0x00,
		0x02,
		0x00,
		0x12,
		0x01,
		0x03,
		0x00,
		0x01,
		0x00,
		0x00,
		0x00,
		0x06,
		0x00,
		0x00,
		0x00,
		0x0e,
		0x01,
		0x02,
		0x00,
		secretText.length,
		0x00,
		0x00,
		0x00,
		0x26,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		...secretText
	]);
	const len = exifPayload.length + 2;
	const app1 = Buffer.from([0xff, 0xe1, (len >> 8) & 0xff, len & 0xff]);
	return Buffer.concat([
		Buffer.from(jpegBytes.subarray(0, 2)),
		app1,
		exifPayload,
		Buffer.from(jpegBytes.subarray(2))
	]);
}

function makeAnimatedWebpHeader(staticWebp: Uint8Array): Uint8Array {
	const vp8xChunk = Buffer.alloc(18);
	vp8xChunk.write('VP8X', 0, 'ascii');
	vp8xChunk.writeUInt32LE(10, 4);
	vp8xChunk[8] = 0x02;
	vp8xChunk[12] = 0;
	vp8xChunk[15] = 0;

	const body = Buffer.concat([vp8xChunk, Buffer.from(staticWebp.subarray(12))]);
	const header = Buffer.alloc(12);
	header.write('RIFF', 0, 'ascii');
	header.writeUInt32LE(4 + body.byteLength, 4);
	header.write('WEBP', 8, 'ascii');
	return Buffer.concat([header, body]);
}

describe('processImagePipeline (sharp)', () => {
	it('keeps small PNG un-enlarged and emits dual WebP buffers', async () => {
		const src = await makeLargePng(120, 80);
		const result = await processImagePipeline(src, { declaredMimeType: 'image/png' });

		expect(result.width).toBe(120);
		expect(result.height).toBe(80);
		expect(result.fullSize).toBeLessThanOrEqual(FULL_MAX_BYTES);
		expect(result.totalCompressedSize).toBe(result.fullSize + result.thumbSize);

		const fullMeta = await sharp(result.fullBuffer).metadata();
		const thumbMeta = await sharp(result.thumbBuffer).metadata();
		expect(fullMeta.format).toBe('webp');
		expect(fullMeta.width).toBe(120);
		expect(fullMeta.height).toBe(80);
		expect(thumbMeta.format).toBe('webp');
		expect(thumbMeta.width).toBe(120);
		expect(thumbMeta.height).toBe(80);
	});

	it('resizes >1920px image proportionally for full (<=1920) and thumb (<=480)', async () => {
		const src = await makeLargePng(2400, 1200);
		const result = await processImagePipeline(src, { declaredMimeType: 'image/png' });

		const fullMeta = await sharp(result.fullBuffer).metadata();
		const thumbMeta = await sharp(result.thumbBuffer).metadata();
		expect(fullMeta.width).toBe(FULL_MAX_DIMENSION);
		expect(fullMeta.height).toBe(960);
		expect(thumbMeta.width).toBe(THUMB_MAX_DIMENSION);
		expect(thumbMeta.height).toBe(240);
	});

	it('applies EXIF auto-orientation and strips EXIF metadata from WebP output', async () => {
		const baseJpeg = new Uint8Array(
			await sharp(TINY_PNG).resize(100, 60, { fit: 'fill' }).jpeg({ quality: 85 }).toBuffer()
		);
		const exifJpeg = addExifOrientation6(baseJpeg);

		const result = await processImagePipeline(exifJpeg, { declaredMimeType: 'image/jpeg' });

		expect(result.width).toBe(60);
		expect(result.height).toBe(100);
		expect(Buffer.from(result.fullBuffer).includes('SecretCameraEXIF')).toBe(false);
		expect(Buffer.from(result.fullBuffer).includes('EXIF')).toBe(false);
		expect(Buffer.from(result.thumbBuffer).includes('SecretCameraEXIF')).toBe(false);
	});

	it('accepts static WebP input', async () => {
		const staticWebp = new Uint8Array(
			await sharp(TINY_PNG).resize(200, 100, { fit: 'fill' }).webp({ quality: 80 }).toBuffer()
		);
		expect(hasAnimatedWebpMarker(staticWebp)).toBe(false);

		const result = await processImagePipeline(staticWebp, { declaredMimeType: 'image/webp' });
		expect(result.width).toBe(200);
		expect(result.height).toBe(100);
	});

	it('rejects animated WebP, GIF, SVG, AVIF, spoofed MIME, and corrupt files', async () => {
		const staticWebp = new Uint8Array(await sharp(TINY_PNG).webp({ quality: 80 }).toBuffer());
		const animatedWebp = makeAnimatedWebpHeader(staticWebp);
		expect(hasAnimatedWebpMarker(animatedWebp)).toBe(true);
		await expect(processImagePipeline(animatedWebp)).rejects.toMatchObject({
			code: 'UNSUPPORTED_MEDIA_TYPE'
		});

		const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
		await expect(processImagePipeline(gif)).rejects.toMatchObject({
			code: 'UNSUPPORTED_MEDIA_TYPE'
		});

		const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
		await expect(processImagePipeline(svg)).rejects.toMatchObject({
			code: 'UNSUPPORTED_MEDIA_TYPE'
		});

		const avifHeader = Buffer.from([
			0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66
		]);
		await expect(processImagePipeline(avifHeader)).rejects.toMatchObject({
			code: 'UNSUPPORTED_MEDIA_TYPE'
		});

		await expect(
			processImagePipeline(TINY_PNG, { declaredMimeType: 'image/jpeg' })
		).rejects.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });

		await expect(processImagePipeline(Buffer.from('not-an-image'))).rejects.toMatchObject({
			code: 'UNSUPPORTED_MEDIA_TYPE'
		});

		await expect(processImagePipeline(new Uint8Array(0))).rejects.toMatchObject({
			code: 'BAD_REQUEST'
		});
	});

	it('rejects decompression bombs (> 50 MP)', async () => {
		const hugePng = Buffer.from(TINY_PNG);
		hugePng.writeUInt32BE(10_000, 16);
		hugePng.writeUInt32BE(10_000, 20);
		await expect(processImagePipeline(hugePng)).rejects.toMatchObject({
			code: 'PAYLOAD_TOO_LARGE'
		});
	});
});
