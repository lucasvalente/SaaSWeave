import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import { client, orpc } from "@saasweave/api/client/tanstack-start/orpc";

export type EventsInput = Parameters<typeof client.admin.security.events>[0];
export type SessionsInput = Parameters<typeof client.admin.sessions.list>[0];
export function useEvents(input: EventsInput) {
  return useQuery({
    ...orpc.admin.security.events.queryOptions({ input }),
    placeholderData: keepPreviousData
  });
}
export function useSessions(input: SessionsInput) {
  return useQuery({
    ...orpc.admin.sessions.list.queryOptions({ input }),
    placeholderData: keepPreviousData
  });
}
export function useRoles() {
  return useQuery(orpc.admin.roles.list.queryOptions());
}
export function useRevokeSession() {
  return useMutation({
    mutationFn: (input: { id: string }) => client.admin.sessions.revoke(input)
  });
}
export function useRevokeAllSessions() {
  return useMutation({
    mutationFn: (input: { userId: string }) => client.admin.sessions.revokeAll(input)
  });
}
