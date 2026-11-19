import { type Paginated, paginate } from '#lib/api/types.js';
import {
	type GalleryDto,
	galleryCreateSchema,
	galleryUpdateSchema
} from '#lib/features/gallery/schemas.js';
import { listQuerySchema } from '#lib/schemas/common.js';
import { notFound } from '#lib/server/api/errors.js';
import type { Actor } from '#lib/server/auth/actor.js';
import { assertAdmin } from '#lib/server/auth/authorize.js';
import {
	findGalleryImage,
	insertGalleryImage,
	listGalleryImages,
	deleteGalleryImage as repoDeleteGalleryImage,
	updateGalleryImage as repoUpdateGalleryImage
} from '#lib/server/features/gallery/repository.js';
import { deleteStoredMedia } from '#lib/server/features/uploads/media-storage.js';
import { isUuid } from '#lib/server/ids.js';
import { revalidateFrontend } from '#lib/server/revalidate.js';
import { normalizeMediaInputForStorage } from '#lib/server/storage/media-url.js';
import { comparableMediaRef } from '#lib/storage/media-key.js';

const LABEL = 'Foto';
const REVALIDATE_TAGS = ['gallery'];

type Viewer = { audience: 'public' } | { audience: 'admin'; actor: Actor | null };

/** Public: 50 items/page. Admin: 12 items/page. Gallery items are always published. */
export async function listGalleryFor(
	viewer: Viewer,
	rawQuery: unknown
): Promise<Paginated<GalleryDto>> {
	const isAdmin = viewer.audience === 'admin';
	if (isAdmin) assertAdmin(viewer.actor);

	const { page, limit } = listQuerySchema(isAdmin ? 12 : 50).parse(rawQuery);
	const { items, total } = await listGalleryImages({
		limit,
		offset: (page - 1) * limit
	});
	return paginate(items, total, page, limit);
}

export async function getGalleryImage(actor: Actor | null, id: string): Promise<GalleryDto> {
	assertAdmin(actor);
	const image = isUuid(id) ? await findGalleryImage(id) : null;
	if (!image) throw notFound(LABEL);
	return image;
}

export async function createGalleryImage(
	actor: Actor | null,
	rawInput: unknown
): Promise<GalleryDto> {
	assertAdmin(actor);
	const parsed = galleryCreateSchema.parse(rawInput);
	const input = {
		...parsed,
		url: normalizeMediaInputForStorage(parsed.url)
	};
	const created = await insertGalleryImage(input);
	revalidateFrontend(REVALIDATE_TAGS);
	return created;
}

export async function updateGalleryImageById(
	actor: Actor | null,
	id: string,
	rawInput: unknown
): Promise<GalleryDto> {
	assertAdmin(actor);
	const parsed = galleryUpdateSchema.parse(rawInput);
	const current = await getGalleryImage(actor, id);
	if (Object.keys(parsed).length === 0) return current;

	const input =
		parsed.url !== undefined
			? {
					...parsed,
					url: normalizeMediaInputForStorage(parsed.url)
				}
			: parsed;

	const result = await repoUpdateGalleryImage(id, input);
	if (!result) throw notFound(LABEL);

	const { item, previousUrl } = result;
	if (previousUrl && comparableMediaRef(previousUrl) !== comparableMediaRef(item.url)) {
		await deleteStoredMedia(previousUrl);
	}
	revalidateFrontend(REVALIDATE_TAGS);
	return item;
}

export async function deleteGalleryImageById(
	actor: Actor | null,
	id: string
): Promise<{ id: string }> {
	assertAdmin(actor);
	const removed = isUuid(id) ? await repoDeleteGalleryImage(id) : null;
	if (!removed) throw notFound(LABEL);

	await deleteStoredMedia(removed.url);
	revalidateFrontend(REVALIDATE_TAGS);
	return { id };
}
