import { isServer, QueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/api/client";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default 30s; feature queries override staleTime via queryOptions.
        staleTime: 30_000,
        // Do not retry 4xx client errors (e.g. 401, 404).
        retry: (failureCount, error) =>
          !(
            error instanceof ApiClientError &&
            error.status >= 400 &&
            error.status < 500
          ) && failureCount < 2,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Server: returns fresh QueryClient per request to avoid cross-request data leakage.
 * Browser: retains singleton QueryClient for active session.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
