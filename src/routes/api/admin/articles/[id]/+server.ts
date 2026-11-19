import { readJson } from '#lib/server/api/request.js';
import { withApi } from '#lib/server/api/with-api.js';
import { deleteArticle, getArticle, updateArticle } from '#lib/server/features/articles/service.js';

type Params = { id: string };

export const GET = withApi<'admin', Params>({ access: 'admin' }, async ({ params, actor }) => ({
	data: await getArticle({ audience: 'admin', actor }, params.id)
}));

export const PATCH = withApi<'admin', Params>(
	{ access: 'admin' },
	async ({ request, params, actor }) => ({
		data: await updateArticle(actor, params.id, await readJson(request))
	})
);

export const DELETE = withApi<'admin', Params>({ access: 'admin' }, async ({ params, actor }) => ({
	data: await deleteArticle(actor, params.id)
}));
