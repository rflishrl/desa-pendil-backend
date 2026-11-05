import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const uri = process.env.DATABASE_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URI is required. Please set it in .env.local.");
  process.exit(1);
}

const sql = neon(uri);
const schemaPath = path.join(process.cwd(), "scripts", "schema.sql");
const ddl = fs.readFileSync(schemaPath, "utf-8");

console.log("Applying schema to Neon PostgreSQL...");
try {
  await sql(ddl);
  console.log("Schema applied successfully.");
} catch (error) {
  console.error("Failed to apply schema:", error);
  process.exit(1);
}
