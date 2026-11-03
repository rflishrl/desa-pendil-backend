/**
 * Error yang aman ditampilkan ke pemanggil API. Pesannya untuk pengguna; detail teknis
 * (mis. pesan mentah Supabase) disimpan di `cause` dan hanya masuk log server.
 */
export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "UNAVAILABLE";

export const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Detik tunggu untuk RATE_LIMITED (header Retry-After). */
  readonly retryAfterSeconds?: number;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }
}

export const notFound = (label: string) =>
  new AppError("NOT_FOUND", `${label} tidak ditemukan.`);
