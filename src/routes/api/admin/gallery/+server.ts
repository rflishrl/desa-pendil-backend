import { listQuerySchema } from '#lib/schemas/common.js';
import { parseQuery, readJson } from '#lib/server/api/request.js';
import { withApi } from '#lib/server/api/with-api.js';
import { createGalleryImage, listGalleryFor } from '#lib/server/features/gallery/service.js';

export const GET = withApi({ access: 'admin' }, async ({ request, actor }) => ({
	data: await listGalleryFor({ audience: 'admin', actor }, parseQuery(request, listQuerySchema(12)))
}));

export const POST = withApi({ access: 'admin' }, async ({ request, actor }) => ({
	data: await createGalleryImage(actor, await readJson(request)),
	status: 201
}));
