import { getDb } from '#lib/server/db/client.js';

/** Lightweight database connectivity check. */
export async function pingDatabase(): Promise<void> {
	const sql = getDb();
	await sql`SELECT 1`;
}
