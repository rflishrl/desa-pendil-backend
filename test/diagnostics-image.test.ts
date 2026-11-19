import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readBody, sameOriginRequest } from './api.js';

const getCurrentAdmin = vi.fn();

vi.mock('#lib/server/auth/session.js', () => ({
	getCurrentAdmin: (...args: unknown[]) => getCurrentAdmin(...args)
}));

const { POST } = await import('../src/routes/api/admin/diagnostics/image/+server.js');

const ADMIN = {
	id: 'a1',
	email: 'admin@desapendil.id',
	role: 'admin' as const
};

const call = (headers?: Record<string, string>) =>
	POST(
		sameOriginRequest('/api/admin/diagnostics/image', {
			method: 'POST',
			headers
		})
	);

beforeEach(() => {
	getCurrentAdmin.mockReset().mockResolvedValue(ADMIN);
});

describe('POST /api/admin/diagnostics/image', () => {
	it('returns 401 when unauthenticated', async () => {
		getCurrentAdmin.mockResolvedValue(null);
		expect((await call()).status).toBe(401);
	});

	it('returns 403 when called from a different origin', async () => {
		expect((await call({ origin: 'https://jahat.example' })).status).toBe(403);
	});

	it('verifies sharp WebP output for admin', async () => {
		const response = await call();
		expect(response.status).toBe(200);
		const body = (await readBody(response)) as {
			success: boolean;
			data: {
				ok: boolean;
				runtime: string;
				sharpVersion: string | null;
				hasSharp: boolean;
				outputBytes: number;
				durationMs: number;
			};
		};

		expect(body.success).toBe(true);
		expect(['node', 'bun']).toContain(body.data.runtime);
		expect(body.data.hasSharp).toBe(true);
		expect(body.data.ok).toBe(true);
		expect(typeof body.data.sharpVersion).toBe('string');
		expect(body.data.outputBytes).toBeGreaterThan(0);
		expect(body.data.durationMs).toBeGreaterThanOrEqual(0);
	});
});
