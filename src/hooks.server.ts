import type { Handle } from '@sveltejs/kit/hooks';

import { getCurrentAdmin } from '#lib/server/auth/session.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = await getCurrentAdmin(event.request, event.cookies);
	return resolve(event);
};
