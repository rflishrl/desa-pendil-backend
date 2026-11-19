import { FRONTEND_URL } from '$app/env/private';
import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.admin) {
		throw redirect(303, '/login');
	}

	const rawUrl = FRONTEND_URL ?? process.env.FRONTEND_URL;
	const frontendUrl =
		rawUrl && rawUrl !== 'http://localhost:3000' ? rawUrl : 'https://desa-pendil.vercel.app/';

	return {
		admin: locals.admin,
		frontendUrl
	};
};
