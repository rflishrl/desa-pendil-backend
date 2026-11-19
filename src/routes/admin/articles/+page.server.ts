import { listArticlesFor } from '#lib/server/features/articles/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q') ?? '';
	const page = url.searchParams.get('page') ?? '1';
	const list = await listArticlesFor(
		{ audience: 'admin', actor: locals.admin },
		{ q: q || undefined, page }
	);
	return { list, q };
};
