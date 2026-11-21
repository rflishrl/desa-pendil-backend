import { AppError } from '#lib/server/api/errors.js';
import { consumeRateLimit } from '#lib/server/api/rate-limit.js';
import { RATE_LIMITS } from '#lib/server/api/rate-limits.js';
import { withApi } from '#lib/server/api/with-api.js';
import { uploadPhoto } from '#lib/server/features/uploads/service.js';

export const POST = withApi({ access: 'admin' }, async ({ request, actor, requestId }) => {
	await consumeRateLimit(RATE_LIMITS.upload, actor.id, requestId);

	const form = await request.formData().catch(() => {
		throw new AppError('BAD_REQUEST', 'Body must be multipart/form-data.');
	});
	return { data: await uploadPhoto(actor, form, requestId), status: 201 };
});
