import { useQuery } from "@tanstack/react-query";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
export function useAdminHealth() {
  return useQuery({ ...orpc.admin.system.health.queryOptions(), refetchInterval: 30000 });
}
export function useAdminOverview() {
  return useQuery({ ...orpc.admin.system.overview.queryOptions(), refetchInterval: 30000 });
}
