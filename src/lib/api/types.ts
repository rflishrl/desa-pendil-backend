/** Standard API response envelope shared across server handlers and client callers. */
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Paginated list response payload. */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
