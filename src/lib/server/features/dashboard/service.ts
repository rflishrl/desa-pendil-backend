import type { Actor } from '#lib/server/auth/actor.js';
import { assertAdmin } from '#lib/server/auth/authorize.js';
import { countArticles } from '#lib/server/features/articles/repository.js';
import { countGalleryImages } from '#lib/server/features/gallery/repository.js';

export interface DashboardCounts {
	articles: number;
	published: number;
	gallery: number;
}

/** Aggregate counts for admin dashboard queried concurrently. */
export async function getDashboardCounts(actor: Actor | null): Promise<DashboardCounts> {
	assertAdmin(actor);
	const [articles, published, gallery] = await Promise.all([
		countArticles(),
		countArticles('published'),
		countGalleryImages()
	]);
	return { articles, published, gallery };
}
