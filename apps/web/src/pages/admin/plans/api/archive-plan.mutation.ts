import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { client as orpcClient, type client } from "@saasweave/api/client/tanstack-start/orpc";
type ArchivePlanInput = Parameters<typeof orpcClient.admin.plans.archive>[0];
export type ArchivePlanMutationResult = Awaited<ReturnType<typeof client.admin.plans.archive>>;
export function useArchivePlanMutation(options?: UseMutationOptions<ArchivePlanMutationResult, Error, ArchivePlanInput>) {
  return useMutation({ mutationFn: (input: ArchivePlanInput) => orpcClient.admin.plans.archive(input), ...options });
}
