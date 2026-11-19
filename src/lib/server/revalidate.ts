import { FRONTEND_URL, REVALIDATE_SECRET } from '$app/env/private';

import { log } from '#lib/server/log.js';

/** Revalidation settings read at runtime from environment variables. */
export function readRevalidateConfig(): {
	baseUrl: string | undefined;
	secret: string | undefined;
} {
	const rawUrl = process.env.VITEST
		? process.env.FRONTEND_URL
		: (FRONTEND_URL ?? process.env.FRONTEND_URL);
	const rawSecret = process.env.VITEST
		? process.env.REVALIDATE_SECRET
		: (REVALIDATE_SECRET ?? process.env.REVALIDATE_SECRET);

	return {
		baseUrl: rawUrl?.trim().replace(/\/$/, '') || undefined,
		secret: rawSecret?.trim() || undefined
	};
}

export type RevalidateOutcome =
	| { state: 'ok'; revalidated: string[] }
	| { state: 'not_configured'; missing: string[] }
	| { state: 'rejected'; status: number }
	| { state: 'unreachable'; reason: string };

/**
 * Calls `POST {FRONTEND_URL}/api/revalidate` and returns the outcome.
 * Catches errors and returns them as values so callers can handle fallback.
 */
export async function sendRevalidate(tags: string[]): Promise<RevalidateOutcome> {
	const { baseUrl, secret } = readRevalidateConfig();
	const missing = [...(baseUrl ? [] : ['FRONTEND_URL']), ...(secret ? [] : ['REVALIDATE_SECRET'])];
	if (!baseUrl || !secret) return { state: 'not_configured', missing };

	try {
		const response = await fetch(`${baseUrl}/api/revalidate`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${secret}`
			},
			body: JSON.stringify({ tags }),
			signal: AbortSignal.timeout(5_000)
		});
		if (!response.ok) return { state: 'rejected', status: response.status };

		const body = (await response.json().catch(() => null)) as {
			revalidated?: unknown;
		} | null;
		const revalidated = Array.isArray(body?.revalidated)
			? body.revalidated.filter((tag): tag is string => typeof tag === 'string')
			: [];
		return { state: 'ok', revalidated };
	} catch (error) {
		return {
			state: 'unreachable',
			reason: error instanceof Error ? error.message : String(error)
		};
	}
}

/**
 * Notifies frontend that data has changed, purging stale cache entries.
 * Schedules work via `waitUntil` when provided by the runtime, otherwise `queueMicrotask`.
 */
export function revalidateFrontend(
	tags: string[],
	waitUntil?: (promise: Promise<unknown>) => void
): void {
	const { baseUrl, secret } = readRevalidateConfig();
	if (!baseUrl || !secret) {
		log('warn', 'revalidate skipped: FRONTEND_URL or REVALIDATE_SECRET is missing', {
			tags,
			hasFrontendUrl: Boolean(baseUrl),
			hasSecret: Boolean(secret)
		});
		return;
	}

	const task = async () => {
		const outcome = await sendRevalidate(tags);
		switch (outcome.state) {
			case 'ok':
				log('info', 'revalidate dispatched', {
					tags,
					revalidated: outcome.revalidated
				});
				break;
			case 'rejected':
				log('error', `revalidate rejected: frontend responded with HTTP ${outcome.status}`, {
					tags,
					status: outcome.status
				});
				break;
			case 'unreachable':
				log('error', 'revalidate failed: frontend unreachable', {
					tags,
					reason: outcome.reason
				});
				break;
			case 'not_configured':
				break;
		}
	};

	if (waitUntil) {
		waitUntil(task());
	} else {
		queueMicrotask(() => {
			void task();
		});
	}
}
