import { listGalleryFor } from '#lib/server/features/gallery/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = url.searchParams.get('page') ?? '1';
	const list = await listGalleryFor({ audience: 'admin', actor: locals.admin }, { page });
	return { list };
};
