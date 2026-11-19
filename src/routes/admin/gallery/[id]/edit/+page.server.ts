import { error } from '@sveltejs/kit';

import { AppError } from '#lib/server/api/errors.js';
import { getGalleryImage } from '#lib/server/features/gallery/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	try {
		const image = await getGalleryImage(locals.admin, params.id);
		return { image };
	} catch (err) {
		if (err instanceof AppError && err.code === 'NOT_FOUND') {
			throw error(404, err.message);
		}
		throw err;
	}
};
