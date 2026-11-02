/** Creates (or resets the password of) the first admin. Run: npm run db:seed */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { admins } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD (min 10 chars).");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 10) {
  console.error("ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

try {
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const name = ADMIN_NAME?.trim() || "Admin Desa";
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  await drizzle(sql)
    .insert(admins)
    .values({ email, name, passwordHash })
    .onConflictDoUpdate({ target: admins.email, set: { name, passwordHash } });

  console.log(`Admin ready: ${email}`);
} finally {
  await sql.end();
}
