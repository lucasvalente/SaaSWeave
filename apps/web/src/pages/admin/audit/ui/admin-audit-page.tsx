import { AuditEventList } from "@/shared/ui/audit-event-list";
import {
  ConsoleErrorState,
  ConsoleSkeleton,
  Panel,
  PanelHeader,
  SectionHeading
} from "@/shared/ui/console-kit";

import { useGetAuditLogQuery, type AuditInput } from "@/pages/admin/audit/api/get-audit-log.query";

export function AdminAuditPage() {
  const [filters, setFilters] = useState<AuditInput>({});
  const [offset, setOffset] = useState(0);
  const query = useGetAuditLogQuery({ ...filters, offset, limit: 25 });

  if (query.isError) {
    return (
      <ConsoleErrorState
        description="Permission denied or audit request failed."
        onRetry={() => query.refetch()}
      />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  const entries = query.data;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Platform"
        title="Audit log"
        description="Every security- and billing-relevant action across all workspaces, newest first."
      />

      <Panel>
        <PanelHeader title="Recent events" description={`${entries.length} entries`} />
        <div className="grid gap-3 p-5 md:grid-cols-3">
          {(["actor", "action", "resource", "workspace", "from", "to"] as const).map((field) => (
            <label key={field} className="text-sm">
              {field}
              <Input
                aria-label={`Audit ${field}`}
                type={field === "from" || field === "to" ? "datetime-local" : "text"}
                onChange={(event) => {
                  const value = event.target.value;
                  setFilters((current) => {
                    return {
                      ...current,
                      [field]: value
                        ? field === "from" || field === "to"
                          ? new Date(value).toISOString()
                          : value
                        : undefined
                    };
                  });
                  setOffset(0);
                }}
              />
            </label>
          ))}
        </div>
        {entries.length > 0 ? (
          <AuditEventList actorLabel={(name) => `by ${name}`} entries={entries} />
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No audit events yet.
          </p>
        )}
      </Panel>
      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={offset === 0}
          onClick={() => setOffset((value) => value - 25)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={entries.length < 25}
          onClick={() => setOffset((value) => value + 25)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
import { useState } from "react";

import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";
