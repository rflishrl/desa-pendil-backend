import "server-only";

import crypto from "node:crypto";

/** Hashes a plain-text password using scrypt with a random 16-byte salt. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/** Verifies a plain-text password against a stored salt:hash string in constant time. */
export function verifyPassword(password: string, combinedHash: string): boolean {
  const parts = combinedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, storedHash] = parts;
  if (!salt || !storedHash) return false;

  const derivedKey = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");
  if (derivedKey.length !== storedBuffer.length) return false;

  return crypto.timingSafeEqual(derivedKey, storedBuffer);
}
