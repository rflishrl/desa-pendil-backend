// Menjalankan Supabase CLI ke database di SUPABASE_DB_URL (dari .env.local).
// - push : menerapkan file di supabase/migrations yang belum diterapkan.
// - types: membuat src/types/database.ts dari skema database.
//
// Pemakaian: npm run db:push   |   npm run db:types
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const command = process.argv[2];
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error(
    "Isi SUPABASE_DB_URL di .env.local (Supabase > Connect > Session pooler).",
  );
  process.exit(1);
}

function supabase(args, options = {}) {
  const result = spawnSync("npx", ["supabase", ...args], {
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: options.capture ? ["inherit", "pipe", "inherit"] : "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

if (command === "push") {
  // Argumen tambahan diteruskan, mis. `npm run db:push -- --dry-run`.
  supabase(["db", "push", "--db-url", dbUrl, ...process.argv.slice(3)]);
} else if (command === "types") {
  const output = supabase(
    ["gen", "types", "typescript", "--db-url", dbUrl, "--schema", "public"],
    { capture: true },
  );
  writeFileSync("src/types/database.ts", output);
  console.log("src/types/database.ts diperbarui.");
} else {
  console.error("Pemakaian: node scripts/supabase-db.mjs <push|types>");
  process.exit(1);
}
