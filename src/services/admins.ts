import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { admins, type Admin } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

export async function findAdminByEmail(email: string): Promise<Admin | undefined> {
  const [row] = await getDb().select().from(admins).where(eq(admins.email, email.toLowerCase())).limit(1);
  return row;
}

export async function countAdmins(): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(admins);
  return row?.total ?? 0;
}

/** Creates or updates the admin with this email (used by the seed script). */
export async function upsertAdmin(input: { email: string; name: string; password: string }) {
  const email = input.email.toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const [row] = await getDb()
    .insert(admins)
    .values({ email, name: input.name, passwordHash })
    .onConflictDoUpdate({ target: admins.email, set: { name: input.name, passwordHash } })
    .returning();
  return row;
}
