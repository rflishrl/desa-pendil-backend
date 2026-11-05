/**
 * Boundary checks:
 * 1. 'use client' files cannot import database, service, repository, or other server modules,
 *    and cannot fetch external domain URLs.
 * 2. NEXT_PUBLIC_ variables are forbidden in code and .env.example.
 * 3. Every route.ts in src/app/api must use withApi().
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
  /from\s+["']@neondatabase\//,
  /from\s+["']@\/lib\/db\//,
  /from\s+["']@\/features\/[^"']+\/(service|repository)["']/,
  /from\s+["']@\/lib\/(env|log|auth\/session|auth\/password|api\/with-api|api\/rate-limit)["']/,
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
      problems.push(`${rel}: client performs external fetch`);
  }

  if (!isTest && /NEXT_PUBLIC_/.test(text))
    problems.push(`${rel}: uses NEXT_PUBLIC_`);

  if (
    /[\\/]app[\\/]api[\\/].*[\\/]route\.ts$/.test(file) &&
    !/withApi(<[^>]*>)?\(/.test(text)
  ) {
    problems.push(`${rel}: route missing withApi()`);
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
console.log("Layer boundaries intact.");
