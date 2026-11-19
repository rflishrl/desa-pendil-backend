import { readJson } from '#lib/server/api/request.js';
import { withApi } from '#lib/server/api/with-api.js';
import {
	deleteGalleryImageById,
	getGalleryImage,
	updateGalleryImageById
} from '#lib/server/features/gallery/service.js';

type Params = { id: string };

export const GET = withApi<'admin', Params>({ access: 'admin' }, async ({ params, actor }) => ({
	data: await getGalleryImage(actor, params.id)
}));

export const PATCH = withApi<'admin', Params>(
	{ access: 'admin' },
	async ({ request, params, actor }) => ({
		data: await updateGalleryImageById(actor, params.id, await readJson(request))
	})
);

export const DELETE = withApi<'admin', Params>({ access: 'admin' }, async ({ params, actor }) => ({
	data: await deleteGalleryImageById(actor, params.id)
}));
