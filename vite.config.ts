import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

const vercelAdapter = adapter({
	runtime: 'nodejs24.x',
	regions: ['sin1']
});

const safeVercelAdapter: typeof vercelAdapter =
	process.platform === 'win32' && !process.env.VERCEL
		? {
				...vercelAdapter,
				async adapt(builder) {
					try {
						await vercelAdapter.adapt(builder);
					} catch (error) {
						const err = error as NodeJS.ErrnoException;
						if (err?.code === 'EPERM' && err?.syscall === 'symlink') {
							builder.log.warn(
								'Skipping .vercel/output symlinks on Windows (enable Developer Mode or build on Linux/Vercel).'
							);
							return;
						}
						throw error;
					}
				}
			}
		: vercelAdapter;

export default defineConfig({
	server: { port: 4000 },
	preview: { port: 4000 },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: safeVercelAdapter
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'test/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					env: {
						DATABASE_URI: 'postgresql://test:test@ep-test.neon.tech/neondb?sslmode=require',
						SESSION_SECRET: '0123456789abcdef0123456789abcdef',
						CRON_SECRET: 'cron-secret-untuk-pengujian',
						R2_ACCESS_KEY_ID: 'test-r2-access-key',
						R2_SECRET_ACCESS_KEY: 'test-r2-secret-key',
						R2_ENDPOINT: 'https://test-account.r2.cloudflarestorage.com',
						R2_BUCKET_NAME: 'desa-pendil',
						R2_PUBLIC_DOMAIN: 'https://media-dp.raflisahrul.my.id'
					}
				}
			}
		]
	}
});
