const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Semua id di database berupa UUID. Id lain bisa langsung dianggap tidak ada. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
