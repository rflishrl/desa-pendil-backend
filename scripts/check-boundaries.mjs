/**
 * Verifies architectural boundaries:
 * 1. 'use client' files must not import Supabase, service, repository, or
 *    other server modules, and must not fetch from external domains.
 * 2. No NEXT_PUBLIC_ prefixed environment variables allowed in code or .env.example.
 * 3. Every route.ts under src/app/api must use withApi().
 *
 * Usage: bun run check:boundaries
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const problems = [];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(path);
  }
  return files;
}

const FORBIDDEN_IN_CLIENT = [
  /from\s+["']@supabase\//,
  /from\s+["']@\/lib\/supabase\//,
  /from\s+["']@\/features\/[^"']+\/(service|repository)["']/,
  /from\s+["']@\/lib\/(env|log|auth\/session|api\/with-api|api\/rate-limit)["']/,
  /from\s+["']server-only["']/,
];
const EXTERNAL_FETCH = /fetch\(\s*[`"']https?:\/\//;

for (const file of walk(join(root, "src"))) {
  const text = readFileSync(file, "utf8");
  const rel = relative(root, file);
  const isTest = /\.test\.tsx?$/.test(file);

  if (/^\s*["']use client["']/.test(text)) {
    for (const pattern of FORBIDDEN_IN_CLIENT) {
      if (pattern.test(text))
        problems.push(`${rel}: client imports server module (${pattern})`);
    }
    if (EXTERNAL_FETCH.test(text))
      problems.push(`${rel}: client external fetch`);
  }

  if (!isTest && /NEXT_PUBLIC_/.test(text))
    problems.push(`${rel}: uses NEXT_PUBLIC_`);

  if (
    /[\\/]app[\\/]api[\\/].*[\\/]route\.ts$/.test(file) &&
    !/withApi(<[^>]*>)?\(/.test(text)
  ) {
    problems.push(`${rel}: route without withApi()`);
  }
}

if (
  /^\s*NEXT_PUBLIC_/m.test(readFileSync(join(root, ".env.example"), "utf8"))
) {
  problems.push(".env.example: uses NEXT_PUBLIC_");
}

if (problems.length > 0) {
  console.error(`Boundary violations (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log("Boundary checks passed.");
