import { defineEnvVars } from '@sveltejs/kit/env';

const optionalString = (value?: string) => value;

export const variables = defineEnvVars({
	PUBLIC_TURNSTILE_SITE_KEY: {
		public: true,
		static: true,
		schema: (value?: string) => value?.trim() || '1x00000000000000000000AA'
	},
	DATABASE_URI: { public: false, static: false, schema: optionalString },
	DATABASE_URL: { public: false, static: false, schema: optionalString },
	POSTGRES_URL: { public: false, static: false, schema: optionalString },
	SESSION_SECRET: { public: false, static: false, schema: optionalString },
	R2_ACCESS_KEY_ID: { public: false, static: false, schema: optionalString },
	R2_SECRET_ACCESS_KEY: { public: false, static: false, schema: optionalString },
	R2_ENDPOINT: { public: false, static: false, schema: optionalString },
	R2_BUCKET_NAME: { public: false, static: false, schema: optionalString },
	R2_PUBLIC_DOMAIN: { public: false, static: false, schema: optionalString },
	R2_APP_QUOTA_MB: { public: false, static: false, schema: optionalString },
	MAX_UPLOAD_MB: { public: false, static: false, schema: optionalString },
	ALLOWED_ORIGINS: { public: false, static: false, schema: optionalString },
	FRONTEND_URL: { public: false, static: false, schema: optionalString },
	REVALIDATE_SECRET: { public: false, static: false, schema: optionalString },
	CRON_SECRET: { public: false, static: false, schema: optionalString },
	TURNSTILE_SECRET_KEY: { public: false, static: false, schema: optionalString },
	TURNSTILE_ALLOWED_HOSTNAMES: { public: false, static: false, schema: optionalString }
});
