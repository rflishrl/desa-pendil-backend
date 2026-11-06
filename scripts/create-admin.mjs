import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline/promises";
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

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run create-admin -- email@example.com");
  process.exit(1);
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const password = await rl.question("Password: ");
rl.close();

if (!password || password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const derivedKey = crypto.scryptSync(password, salt, 64);
const passwordHash = `${salt}:${derivedKey.toString("hex")}`;

const sql = neon(uri);
try {
  await sql`
    INSERT INTO admin_users (email, password_hash, role)
    VALUES (${email}, ${passwordHash}, 'admin')
    ON CONFLICT (email) DO UPDATE
    SET password_hash = ${passwordHash}, role = 'admin', updated_at = NOW()
  `;
  console.log(`Admin user registered successfully: ${email}`);
} catch (error) {
  console.error("Failed to create admin:", error);
  process.exit(1);
}
