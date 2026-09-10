import { QueryClient } from "@tanstack/react-query";

let _queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!_queryClient) {
    _queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 30, // 30 seconds
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return _queryClient;
}
