/** Bentuk semua respons API. Dipakai bersama server (withApi) dan client (api/client.ts). */
export type ApiResponse<T> =
  { success: true; data: T } | { success: false; error: string };

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Isi `data` untuk endpoint daftar. */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
