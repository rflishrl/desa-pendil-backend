/**
 * Enforces SvelteKit 3 layer boundaries:
 * 1. Client/shared files (outside src/lib/server, src/hooks.server.ts, src/env.ts, and server route files)
 *    must never import Neon, `#lib/server/*`, `$app/env/private`, `aws4fetch`, or `sharp`, and must not fetch external URLs directly.
 * 2. No deprecated `NEXT_PUBLIC_` or `VITE_` public env prefixes in source files or `.env.example`.
 * 3. Every API endpoint (`src/routes/api/.../+server.ts`) must use `withApi()`.
 *
 * Run: bun run check:boundaries
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const problems = [];

function walk(dir, files = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, files);
		else if (/\.(ts|svelte)$/.test(name)) files.push(path);
	}
	return files;
}

function isServerFile(rel) {
	const norm = rel.replace(/\\/g, '/');
	return (
		norm.startsWith('src/lib/server/') ||
		norm === 'src/hooks.server.ts' ||
		norm === 'src/env.ts' ||
		/\/\+server\.ts$/.test(norm) ||
		/\/\+[^/]*\.server\.ts$/.test(norm)
	);
}

const FORBIDDEN_IN_CLIENT = [
	/from\s+["']@neondatabase\//,
	/from\s+["']aws4fetch["']/,
	/from\s+["']sharp["']/,
	/from\s+["']\$app\/env\/private["']/,
	/from\s+["']#lib\/server\//
];
const EXTERNAL_FETCH = /fetch\(\s*[`"']https?:\/\//;

for (const file of walk(join(root, 'src'))) {
	const text = readFileSync(file, 'utf8');
	const rel = relative(root, file);
	const isTest = /\.(test|spec)\.(ts|tsx)$/.test(file);

	if (!isTest && !/\.d\.ts$/.test(file) && !isServerFile(rel)) {
		for (const pattern of FORBIDDEN_IN_CLIENT) {
			if (pattern.test(text)) {
				problems.push(`${rel}: client/shared module imports server dependency (${pattern})`);
			}
		}
		if (EXTERNAL_FETCH.test(text)) {
			problems.push(`${rel}: client/shared module calls external fetch directly`);
		}
	}

	if (!isTest && (/\bNEXT_PUBLIC_/.test(text) || /\bVITE_TURNSTILE_/.test(text))) {
		problems.push(`${rel}: uses legacy NEXT_PUBLIC_ or VITE_TURNSTILE_ prefix`);
	}

	if (
		/[\\/]routes[\\/]api[\\/].*\+server\.ts$/.test(file) &&
		!/withApi(<[^>]*>)?\(/.test(text)
	) {
		problems.push(`${rel}: API route missing withApi() wrapper`);
	}
}

const envExample = readFileSync(join(root, '.env.example'), 'utf8');
if (/^\s*(NEXT_PUBLIC_|VITE_)/m.test(envExample)) {
	problems.push('.env.example: uses legacy NEXT_PUBLIC_ or VITE_ prefix');
}

if (problems.length > 0) {
	console.error(`Boundary violations (${problems.length}):`);
	for (const p of problems) console.error(' -', p);
	process.exit(1);
}

console.log('Layer boundaries intact.');
