import { withApi } from '#lib/server/api/with-api.js';
import { cleanupOrphanMedia } from '#lib/server/features/uploads/cleanup-service.js';

export const GET = withApi({ access: 'public' }, async ({ request }) => ({
	data: await cleanupOrphanMedia(request.headers.get('authorization'))
}));
