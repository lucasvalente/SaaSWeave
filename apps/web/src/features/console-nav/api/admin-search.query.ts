import { useQuery } from "@tanstack/react-query";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
export function useAdminSearch(search: string, enabled: boolean) {
  return useQuery({
    ...orpc.admin.search.queryOptions({ input: { search } }),
    enabled: enabled && search.trim().length >= 2
  });
}
