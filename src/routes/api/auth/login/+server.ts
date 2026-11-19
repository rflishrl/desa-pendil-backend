import { AppError } from '#lib/server/api/errors.js';
import { getClientIp, resetRateLimit } from '#lib/server/api/rate-limit.js';
import { RATE_LIMITS } from '#lib/server/api/rate-limits.js';
import { readJson } from '#lib/server/api/request.js';
import { withApi } from '#lib/server/api/with-api.js';
import { login } from '#lib/server/features/auth/service.js';
import { verifyTurnstile } from '#lib/server/turnstile.js';

export const POST = withApi(
	{ access: 'session', rateLimit: RATE_LIMITS.login },
	async ({ request, cookies }) => {
		const clientIp = getClientIp(request);
		const body = (await readJson(request)) as { turnstileToken?: string };

		const verification = await verifyTurnstile({
			token: body?.turnstileToken ?? '',
			expectedAction: 'login',
			clientIp
		});

		if (!verification.success) {
			throw new AppError('VALIDATION', 'Verifikasi gagal.');
		}

		const { data, setCookieHeader } = await login(body, cookies);
		await resetRateLimit(RATE_LIMITS.login, clientIp);
		return {
			data,
			headers: cookies ? undefined : { 'set-cookie': setCookieHeader }
		};
	}
);
