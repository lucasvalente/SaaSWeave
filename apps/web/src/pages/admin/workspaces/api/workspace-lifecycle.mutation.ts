import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

import { client as orpcClient, type client } from "@saasweave/api/client/tanstack-start/orpc";

type SuspendInput = Parameters<typeof orpcClient.admin.workspaces.suspend>[0];
type ReactivateInput = Parameters<typeof orpcClient.admin.workspaces.reactivate>[0];

export function useSuspendWorkspaceMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof client.admin.workspaces.suspend>>,
    Error,
    SuspendInput
  >
) {
  return useMutation({
    mutationFn: (input: SuspendInput) => orpcClient.admin.workspaces.suspend(input),
    ...options
  });
}

export function useReactivateWorkspaceMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof client.admin.workspaces.reactivate>>,
    Error,
    ReactivateInput
  >
) {
  return useMutation({
    mutationFn: (input: ReactivateInput) => orpcClient.admin.workspaces.reactivate(input),
    ...options
  });
}
