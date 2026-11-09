import type { ApiResponse } from "@/lib/api/types";

export const BASE_URL = "http://localhost:4000";

/** Creates mock Request with matching Origin and Host headers (passes CSRF verification). */
export function sameOriginRequest(
  path: string,
  init: {
    method?: string;
    json?: unknown;
    body?: BodyInit | null;
    headers?: Record<string, string>;
  } = {},
): Request {
  const headers: Record<string, string> = {
    host: "localhost:4000",
    origin: BASE_URL,
    ...init.headers,
  };
  if (init.json !== undefined) headers["content-type"] = "application/json";
  return new Request(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers,
    body:
      init.body !== undefined
        ? init.body
        : init.json !== undefined
          ? JSON.stringify(init.json)
          : undefined,
  });
}

export async function readBody<T = unknown>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

export const routeParams = <P>(params: P) => ({
  params: Promise.resolve(params),
});
