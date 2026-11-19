import { listQuerySchema } from '#lib/schemas/common.js';
import { RATE_LIMITS } from '#lib/server/api/rate-limits.js';
import { parseQuery } from '#lib/server/api/request.js';
import { withApi } from '#lib/server/api/with-api.js';
import { listGalleryFor } from '#lib/server/features/gallery/service.js';

export const GET = withApi(
	{
		access: 'public',
		rateLimit: RATE_LIMITS.publicRead,
		cacheControl: 'public, s-maxage=60, stale-while-revalidate=300'
	},
	async ({ request }) => ({
		data: await listGalleryFor({ audience: 'public' }, parseQuery(request, listQuerySchema(50)))
	})
);
