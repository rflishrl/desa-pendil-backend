import { listQuerySchema } from '#lib/schemas/common.js';
import { parseQuery, readJson } from '#lib/server/api/request.js';
import { withApi } from '#lib/server/api/with-api.js';
import { createArticle, listArticlesFor } from '#lib/server/features/articles/service.js';

export const GET = withApi({ access: 'admin' }, async ({ request, actor }) => ({
	data: await listArticlesFor(
		{ audience: 'admin', actor },
		parseQuery(request, listQuerySchema(10))
	)
}));

export const POST = withApi({ access: 'admin' }, async ({ request, actor }) => ({
	data: await createArticle(actor, await readJson(request)),
	status: 201
}));
