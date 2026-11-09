const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates canonical UUID format used for database record identifiers. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
