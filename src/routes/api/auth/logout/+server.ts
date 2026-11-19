import { withApi } from '#lib/server/api/with-api.js';
import { logout } from '#lib/server/features/auth/service.js';

export const POST = withApi({ access: 'session' }, async ({ cookies }) => {
	const { data, setCookieHeader } = await logout(cookies);
	return {
		data,
		headers: cookies ? undefined : { 'set-cookie': setCookieHeader }
	};
});
