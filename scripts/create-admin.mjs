import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";
import readline from "node:readline/promises";

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: npm run create-admin -- email@example.com");
  process.exit(1);
}

const uri = process.env.DATABASE_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URI is required. Please set it in .env.local.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
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
    VALUES (${email.toLowerCase().trim()}, ${passwordHash}, 'admin')
    ON CONFLICT (email) DO UPDATE
    SET password_hash = ${passwordHash}, role = 'admin', updated_at = NOW()
  `;
  console.log(`Admin user registered successfully: ${email}`);
} catch (error) {
  console.error("Failed to create admin:", error);
  process.exit(1);
}
