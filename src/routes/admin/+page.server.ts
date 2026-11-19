import {
	R2_ACCESS_KEY_ID,
	R2_BUCKET_NAME,
	R2_ENDPOINT,
	R2_PUBLIC_DOMAIN,
	R2_SECRET_ACCESS_KEY
} from '$app/env/private';

import { getDashboardCounts } from '#lib/server/features/dashboard/service.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const counts = await getDashboardCounts(locals.admin);
	const storageReady = Boolean(
		(R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID) &&
		(R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY) &&
		(R2_ENDPOINT ?? process.env.R2_ENDPOINT) &&
		(R2_BUCKET_NAME ?? process.env.R2_BUCKET_NAME) &&
		(R2_PUBLIC_DOMAIN ?? process.env.R2_PUBLIC_DOMAIN)
	);

	return { counts, storageReady };
};
