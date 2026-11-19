import {
	MEDIA_STORAGE_DEFAULT_LIMIT,
	mediaStorageQuerySchema
} from '#lib/features/uploads/schemas.js';
import { getMediaStorageSummary } from '#lib/server/features/uploads/storage-service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const query = mediaStorageQuerySchema.parse({
		page: url.searchParams.get('page') ?? 1,
		limit: MEDIA_STORAGE_DEFAULT_LIMIT
	});
	const summary = await getMediaStorageSummary(locals.admin, query);
	return { summary };
};
