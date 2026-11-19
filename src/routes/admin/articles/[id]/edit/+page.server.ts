import { error } from '@sveltejs/kit';

import { AppError } from '#lib/server/api/errors.js';
import { getArticle } from '#lib/server/features/articles/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	try {
		const article = await getArticle({ audience: 'admin', actor: locals.admin }, params.id);
		return { article };
	} catch (err) {
		if (err instanceof AppError && err.code === 'NOT_FOUND') {
			throw error(404, err.message);
		}
		throw err;
	}
};
