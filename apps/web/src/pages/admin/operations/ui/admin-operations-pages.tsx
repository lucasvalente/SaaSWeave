import { useState } from "react";
import { toast } from "sonner";

import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import { ConfirmActionDialog } from "@/shared/ui/confirm-action-dialog";
import {
  Badge,
  ConsoleErrorState,
  ConsoleSkeleton,
  Panel,
  PanelHeader,
  SectionHeading
} from "@/shared/ui/console-kit";

import {
  useEvents,
  useSessions,
  useRoles,
  useRevokeSession,
  useRevokeAllSessions,
  type EventsInput
} from "@/pages/admin/operations/api/operations.query";

export function AdminSecurityEventsPage() {
  const [filters, setFilters] = useState<EventsInput>({});
  const [offset, setOffset] = useState(0);
  const query = useEvents({ ...filters, offset, limit: 25 });
  if (query.isError) {
    return (
      <ConsoleErrorState
        description={m.admin__no_security_events()}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin__security()}
        title={m.admin__security_events()}
        description="Sanitized platform security evidence, newest first."
      />
      <Panel>
        <PanelHeader title={m.admin__events()} />
        <div className="grid gap-3 p-5 md:grid-cols-3">
          {(["type", "actor", "from", "to"] as const).map((field) => (
            <label key={field}>
              {field}
              <Input
                aria-label={`Security ${field}`}
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
          <label>
            {m.admin__severity()}
            <select
              aria-label="Security severity"
              value={filters.severity ?? ""}
              onChange={(event) => {
                setFilters((value) => {
                  return {
                    ...value,
                    severity:
                      event.target.value === ""
                        ? undefined
                        : (event.target.value as EventsInput["severity"])
                  };
                });
                setOffset(0);
              }}
            >
              <option value="">{m.admin__all()}</option>
              <option value="info">{m.admin__info()}</option>
              <option value="warning">{m.admin__warning()}</option>
              <option value="critical">{m.admin__critical()}</option>
            </select>
          </label>
        </div>
        <div aria-busy={query.isFetching} className="divide-y divide-border">
          {query.data.map((event) => (
            <div className="flex items-center justify-between gap-4 px-5 py-3" key={event.id}>
              <div>
                <p>{event.type}</p>
                <p className="text-xs text-muted-foreground">
                  {event.createdAt.toISOString()} · {event.actorUserId ?? "system"}
                </p>
              </div>
              <Badge
                tone={
                  event.severity === "critical"
                    ? "destructive"
                    : event.severity === "warning"
                      ? "warning"
                      : "info"
                }
              >
                {event.severity}
              </Badge>
            </div>
          ))}
        </div>
        {query.data.length === 0 && <p className="p-5">{m.admin__no_security_events()}</p>}
      </Panel>
      <div className="flex gap-3">
        <Button
          disabled={offset === 0 || query.isFetching}
          onClick={() => setOffset((value) => value - 25)}
        >
          {m.admin__previous()}
        </Button>
        <Button
          disabled={query.data.length < 25 || query.isFetching}
          onClick={() => setOffset((value) => value + 25)}
        >
          {m.admin__next()}
        </Button>
      </div>
    </div>
  );
}

export function AdminRolesPage() {
  const query = useRoles();
  if (query.isError) {
    return (
      <ConsoleErrorState description={m.admin__backend_grants()} onRetry={() => query.refetch()} />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin__access()}
        title={m.admin__roles_permissions()}
        description={m.admin__backend_grants()}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {query.data.map((entry) => (
          <Panel key={entry.role}>
            <PanelHeader
              title={entry.role}
              description={m.admin__permissions_count({ count: entry.permissions.length })}
            />
            <ul className="space-y-1 px-5 py-4 font-mono text-xs text-muted-foreground">
              {entry.permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}

export function AdminSessionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "expired" | undefined>();
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const query = useSessions({ search, status, cursor: cursors.at(-1), limit: 25 });
  const revoke = useRevokeSession();
  const revokeAll = useRevokeAllSessions();
  const complete = {
    onSuccess: () => {
      toast.success(m.admin__revoke_session());
      void query.refetch();
    },
    onError: () => toast.error(m.admin__backend_grants())
  };
  if (query.isError) {
    return (
      <ConsoleErrorState description={m.admin__backend_grants()} onRetry={() => query.refetch()} />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin__access()}
        title={m.admin__sessions()}
        description={m.admin__sessions_description()}
      />
      <Input
        aria-label={m.admin__search_sessions()}
        placeholder={m.admin__search_email()}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setCursors([undefined]);
        }}
      />
      <Panel>
        <PanelHeader title={m.admin__active_recent_sessions()} />
        <label className="block p-5">
          {m.admin__status()}{" "}
          <select
            aria-label="Session status"
            value={status ?? ""}
            onChange={(event) => {
              setStatus(
                event.target.value === "" ? undefined : (event.target.value as "active" | "expired")
              );
              setCursors([undefined]);
            }}
          >
            <option value="">{m.admin__all()}</option>
            <option value="active">{m.user_detail__status_active()}</option>
            <option value="expired">{m.admin__expired()}</option>
          </select>
        </label>
        <div aria-busy={query.isFetching} className="divide-y divide-border">
          {query.data.data.map((entry) => (
            <div
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-3"
              key={entry.id}
            >
              <div>
                <p>
                  {entry.name} · {entry.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.ipAddress ?? "IP unavailable"} · {entry.userAgent ?? "Unknown device"}
                </p>
              </div>
              <Badge tone={entry.mfaEnabled ? "success" : "neutral"}>
                {entry.mfaEnabled ? "MFA" : "No MFA"}
              </Badge>
              <ConfirmActionDialog
                title="Revoke session?"
                description={`End this session for ${entry.email}.`}
                confirmLabel="Revoke"
                onConfirm={() => revoke.mutate({ id: entry.id }, complete)}
              >
                <Button variant="outline" disabled={revoke.isPending}>
                  Revoke session
                </Button>
              </ConfirmActionDialog>
              <ConfirmActionDialog
                title="Revoke all sessions?"
                description={`Sign ${entry.email} out on every device.`}
                confirmLabel="Revoke all"
                onConfirm={() => revokeAll.mutate({ userId: entry.userId }, complete)}
              >
                <Button variant="outline" disabled={revokeAll.isPending}>
                  Revoke all
                </Button>
              </ConfirmActionDialog>
            </div>
          ))}
        </div>
        {query.data.data.length === 0 && <p className="p-5">{m.admin__no_sessions()}</p>}
      </Panel>
      <div className="flex gap-3">
        <Button
          disabled={cursors.length === 1 || query.isFetching}
          onClick={() => setCursors((value) => value.slice(0, -1))}
        >
          Previous
        </Button>
        <Button
          disabled={!query.data.meta.nextCursor || query.isFetching}
          onClick={() =>
            setCursors((value) => [...value, query.data?.meta.nextCursor ?? undefined])
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}
