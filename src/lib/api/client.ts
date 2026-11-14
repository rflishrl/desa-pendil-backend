import type { ApiResponse } from "@/lib/api/types";

/** API client error containing HTTP status and sanitized message. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  json?: unknown;
  body?: FormData;
  signal?: AbortSignal;
}

function assertRelative(path: string): void {
  // Restrict to same-origin relative paths; reject absolute URLs and protocol-relative '//'.
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`Endpoint must be a relative path: ${path}`);
  }
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as { success: unknown }).success === "boolean"
  );
}

/** Sends request to internal BFF endpoint, validates ApiResponse, and returns typed data. */
export async function apiRequest<T>(
  path: string,
  { method = "GET", json, body, signal }: RequestOptions = {},
): Promise<T> {
  assertRelative(path);

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      signal,
      credentials: "same-origin",
      headers: json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: json !== undefined ? JSON.stringify(json) : body,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError("Unable to connect to server. Please check your connection.", 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!isApiResponse(payload)) {
    throw new ApiClientError("Unrecognized server response.", response.status);
  }
  if (!payload.success) {
    throw new ApiClientError(payload.error, response.status);
  }
  return payload.data as T;
}

export interface UploadProgressOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

function uploadWithProgress<T>(
  path: string,
  body: FormData,
  options: UploadProgressOptions,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path);
    xhr.withCredentials = true;

    const cleanupSignal = () => {
      options.signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      xhr.abort();
      cleanupSignal();
      reject(new DOMException("Unggahan dibatalkan.", "AbortError"));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        reject(new DOMException("Unggahan dibatalkan.", "AbortError"));
        return;
      }
      options.signal.addEventListener("abort", handleAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
        options.onProgress?.(percent);
      }
    };

    xhr.onload = () => {
      cleanupSignal();
      let payload: unknown = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }

      if (!isApiResponse(payload)) {
        reject(new ApiClientError("Unrecognized server response.", xhr.status));
        return;
      }
      if (!payload.success) {
        reject(new ApiClientError(payload.error, xhr.status));
        return;
      }
      options.onProgress?.(100);
      resolve(payload.data as T);
    };

    xhr.onerror = () => {
      cleanupSignal();
      reject(new ApiClientError("Unable to connect to server. Please check your connection.", 0));
    };

    xhr.onabort = () => {
      cleanupSignal();
      reject(new DOMException("Unggahan dibatalkan.", "AbortError"));
    };

    xhr.send(body);
  });
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json: unknown) => apiRequest<T>(path, { method: "PATCH", json }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, body: FormData, options?: UploadProgressOptions) =>
    options?.onProgress || options?.signal
      ? uploadWithProgress<T>(path, body, options)
      : apiRequest<T>(path, { method: "POST", body }),
};

/** Serializes object into URL query string, omitting undefined and empty values. */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
