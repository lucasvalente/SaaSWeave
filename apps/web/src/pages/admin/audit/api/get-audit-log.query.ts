import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@saasweave/api/client/tanstack-start/orpc";

export type AuditInput = Parameters<typeof client.admin.security.audit>[0];
export function getAuditLogQueryOptions(input: AuditInput = {}) {
  return orpc.admin.security.audit.queryOptions({ input });
}

export function useGetAuditLogQuery(input: AuditInput = {}) {
  return useQuery({ ...getAuditLogQueryOptions(input), placeholderData: keepPreviousData });
}

export type AuditLogQueryResult = Awaited<ReturnType<typeof client.admin.auditLog>>;
