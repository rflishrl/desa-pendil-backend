import { mediaStorageQuerySchema } from '#lib/features/uploads/schemas.js';
import { parseQuery } from '#lib/server/api/request.js';
import { withApi } from '#lib/server/api/with-api.js';
import { getMediaStorageSummary } from '#lib/server/features/uploads/storage-service.js';

export const GET = withApi({ access: 'admin' }, async ({ request, actor }) => ({
	data: await getMediaStorageSummary(actor, parseQuery(request, mediaStorageQuerySchema))
}));
