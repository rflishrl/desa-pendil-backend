import { RATE_LIMITS } from '#lib/server/api/rate-limits.js';
import { withApi } from '#lib/server/api/with-api.js';
import { getArticle } from '#lib/server/features/articles/service.js';

export const GET = withApi<'public', { id: string }>(
	{
		access: 'public',
		rateLimit: RATE_LIMITS.publicRead,
		cacheControl: 'public, s-maxage=60, stale-while-revalidate=300'
	},
	async ({ params }) => ({
		data: await getArticle({ audience: 'public' }, params.id)
	})
);
