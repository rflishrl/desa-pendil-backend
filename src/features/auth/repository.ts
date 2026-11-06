import "server-only";

import { AppError } from "@/lib/api/errors";
import { getDb } from "@/lib/db/client";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT id, email, password_hash, role
      FROM admin_users
      WHERE LOWER(email) = LOWER(${email.trim()})
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0] as unknown as UserRow;
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role as "admin" | "user",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INTERNAL",
      "Gagal menghubungi basis data admin. Pastikan migrasi database telah dijalankan.",
      { cause: error },
    );
  }
}
