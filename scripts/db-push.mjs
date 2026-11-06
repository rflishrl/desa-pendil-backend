import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

// Automatically load local env file if not already provided via shell
for (const envFile of [".env.local", ".env.production.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {}
  }
}

const uri =
  process.env.DATABASE_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!uri) {
  console.error(
    "Error: DATABASE_URI, DATABASE_URL, or POSTGRES_URL is required.",
  );
  process.exit(1);
}

const schemaPath = path.resolve(process.cwd(), "scripts/schema.sql");
const sqlContent = fs.readFileSync(schemaPath, "utf-8");

console.log("Applying schema to Neon PostgreSQL...");
const sql = neon(uri);

try {
  // Execute individual DDL statements split by semicolon via sql.query()
  const statements = sqlContent
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log("Schema applied successfully.");
} catch (error) {
  console.error("Failed to apply schema:", error);
  process.exit(1);
}
