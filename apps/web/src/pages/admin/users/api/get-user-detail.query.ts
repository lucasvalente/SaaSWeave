import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@saasweave/api/client/tanstack-start/orpc";

export const userDetailQueryKeys = {
  byId(id: string) {
    return orpc.admin.users.detail.queryKey({ input: { id } });
  }
};

export function getUserDetailQueryOptions(id: string) {
  return orpc.admin.users.detail.queryOptions({ input: { id } });
}

export function useGetUserDetailQuery(id: string) {
  return useQuery(getUserDetailQueryOptions(id));
}

export type UserDetailQueryResult = Awaited<ReturnType<typeof client.admin.users.detail>>;
