import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigError } from '#lib/server/env.js';
import {
	assertValidMediaKey,
	assertValidObjectKey,
	deriveThumbKey,
	generateMediaKey,
	getPublicMediaUrl,
	getPublicThumbUrl,
	isValidMediaKey,
	isValidObjectKey,
	normalizeMediaInputForStorage
} from '#lib/server/storage/media-url.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const DOMAIN = 'https://media-dp.raflisahrul.my.id';

beforeEach(() => {
	vi.stubEnv('R2_PUBLIC_DOMAIN', DOMAIN);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('media key validation & derivation', () => {
	it('accepts canonical full keys with and without dev/ prefix', () => {
		expect(isValidMediaKey(`${VALID_UUID}.webp`)).toBe(true);
		expect(isValidMediaKey(`dev/${VALID_UUID}.webp`)).toBe(true);
		expect(assertValidMediaKey(`${VALID_UUID}.webp`)).toBe(`${VALID_UUID}.webp`);
	});

	it('rejects traversal, leading slashes, uppercase, query strings, and non-webp', () => {
		const invalid = [
			'',
			`/${VALID_UUID}.webp`,
			`../${VALID_UUID}.webp`,
			`dev/../../${VALID_UUID}.webp`,
			`prod/${VALID_UUID}.webp`,
			`${VALID_UUID}.png`,
			`${VALID_UUID.toUpperCase()}.webp`,
			`${VALID_UUID}.webp?v=1`,
			`${VALID_UUID}-thumb.webp`,
			'arbitrary-name.webp'
		];
		for (const key of invalid) {
			expect(isValidMediaKey(key)).toBe(false);
			expect(() => assertValidMediaKey(key)).toThrow();
		}
	});

	it('validates object keys including deterministic -thumb.webp variant', () => {
		expect(deriveThumbKey(`${VALID_UUID}.webp`)).toBe(`${VALID_UUID}-thumb.webp`);
		expect(deriveThumbKey(`dev/${VALID_UUID}.webp`)).toBe(`dev/${VALID_UUID}-thumb.webp`);
		expect(isValidObjectKey(`${VALID_UUID}-thumb.webp`)).toBe(true);
		expect(isValidObjectKey(`dev/${VALID_UUID}-thumb.webp`)).toBe(true);
		expect(() => assertValidObjectKey('../bad-thumb.webp')).toThrow();
	});

	it('generates lowercase uuid keys with dev/ prefix outside production', () => {
		expect(isValidMediaKey(generateMediaKey(false))).toBe(true);
		expect(generateMediaKey(false).startsWith('dev/')).toBe(false);

		const devKey = generateMediaKey(true);
		expect(isValidMediaKey(devKey)).toBe(true);
		expect(devKey.startsWith('dev/')).toBe(true);
	});
});

describe('getPublicMediaUrl & getPublicThumbUrl', () => {
	it('builds full and thumb URLs from R2_PUBLIC_DOMAIN (trimming trailing slash)', () => {
		vi.stubEnv('R2_PUBLIC_DOMAIN', `${DOMAIN}/`);
		expect(getPublicMediaUrl(`${VALID_UUID}.webp`)).toBe(`${DOMAIN}/${VALID_UUID}.webp`);
		expect(getPublicThumbUrl(`${VALID_UUID}.webp`)).toBe(`${DOMAIN}/${VALID_UUID}-thumb.webp`);
		expect(getPublicMediaUrl(`dev/${VALID_UUID}.webp`)).toBe(`${DOMAIN}/dev/${VALID_UUID}.webp`);
		expect(getPublicThumbUrl(`dev/${VALID_UUID}.webp`)).toBe(
			`${DOMAIN}/dev/${VALID_UUID}-thumb.webp`
		);
	});

	it('preserves matching R2 origin URLs and handles empty values', () => {
		const fullUrl = `${DOMAIN}/dev/${VALID_UUID}.webp`;
		expect(getPublicMediaUrl(fullUrl)).toBe(fullUrl);
		expect(getPublicThumbUrl(fullUrl)).toBe(`${DOMAIN}/dev/${VALID_UUID}-thumb.webp`);
		expect(getPublicMediaUrl('')).toBe('');
		expect(getPublicThumbUrl('')).toBe('');
	});

	it('throws ConfigError when resolving a key without a valid https R2_PUBLIC_DOMAIN', () => {
		vi.stubEnv('R2_PUBLIC_DOMAIN', '');
		expect(() => getPublicMediaUrl(`${VALID_UUID}.webp`)).toThrow(ConfigError);

		vi.stubEnv('R2_PUBLIC_DOMAIN', 'http://insecure.example.com');
		expect(() => getPublicThumbUrl(`${VALID_UUID}.webp`)).toThrow(ConfigError);
	});

	it('normalizes R2 domain URLs into canonical keys and rejects wrong origins or unknown hosts', () => {
		expect(normalizeMediaInputForStorage(`${DOMAIN}/dev/${VALID_UUID}.webp`)).toBe(
			`dev/${VALID_UUID}.webp`
		);
		expect(normalizeMediaInputForStorage(`${VALID_UUID}.webp`)).toBe(`${VALID_UUID}.webp`);
		expect(() =>
			normalizeMediaInputForStorage('https://legacy-cdn.example.com/desa-pendil/articles/a.jpg')
		).toThrow();
		expect(() =>
			normalizeMediaInputForStorage(`https://wrong-host.example.com/${VALID_UUID}.webp`)
		).toThrow();
	});
});
