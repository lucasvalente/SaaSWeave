import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@saasweave/api/client/tanstack-start/orpc";

export type WorkspacesInput = Parameters<typeof client.admin.workspaces.list>[0];
export function getWorkspacesQueryOptions(input: WorkspacesInput = {}) {
  return orpc.admin.workspaces.list.queryOptions({ input });
}

export function useGetWorkspacesQuery(input: WorkspacesInput = {}) {
  return useQuery({ ...getWorkspacesQueryOptions(input), placeholderData: keepPreviousData });
}

export type WorkspacesQueryResult = Awaited<ReturnType<typeof client.admin.workspaces.list>>;
