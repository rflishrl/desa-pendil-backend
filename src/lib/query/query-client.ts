import { isServer, QueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/api/client";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Bawaan 30 detik; tiap fitur menetapkan staleTime sendiri di queryOptions.
        staleTime: 30_000,
        // Error 4xx (mis. 401, 404) tidak membaik jika diulang.
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
 * Server: QueryClient baru per request (data tidak bocor antar pengguna).
 * Browser: satu QueryClient untuk seluruh sesi tab.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
