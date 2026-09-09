import { m } from "@saasweave/i18n/messages";
import { Link } from "@saasweave/i18n/tanstack-start/components/link";
import { Button } from "@saasweave/ui/components/button";

import {
  Badge,
  ConsoleEmptyState,
  ConsoleErrorState,
  ConsoleSkeleton,
  formatDate,
  Panel,
  PanelHeader,
  SectionHeading
} from "@/shared/ui/console-kit";

import { useGetUserDetailQuery } from "@/pages/admin/users/api/get-user-detail.query";

export function AdminUserDetailPage({ id }: { id: string }) {
  const query = useGetUserDetailQuery(id);
  if (query.isError) {
    return (
      <ConsoleErrorState description={m.admin_users__not_found()} onRetry={() => query.refetch()} />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  const user = query.data;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin_users__detail_eyebrow()}
        title={user.name}
        description={user.email}
        action={
          <Button asChild variant="outline">
            <Link to="/admin/users">{m.admin_users__back()}</Link>
          </Button>
        }
      />
      <Panel>
        <PanelHeader title={m.admin_users__identity()} />
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{m.user_detail__status_label()}</dt>
            <dd className="mt-1">
              <Badge tone={user.banned ? "destructive" : "success"}>
                {user.banned ? m.user_detail__status_suspended() : m.user_detail__status_active()}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.user_detail__mfa_label()}</dt>
            <dd className="mt-1">
              <Badge tone={user.twoFactorEnabled ? "success" : "neutral"}>
                {user.twoFactorEnabled ? m.user_detail__enabled() : m.user_detail__not_enrolled()}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.user_detail__created_label()}</dt>
            <dd className="mt-1">{formatDate(user.createdAt.toISOString())}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.user_detail__updated_label()}</dt>
            <dd className="mt-1">{formatDate(user.updatedAt.toISOString())}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{m.user_detail__platform_roles()}</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {user.roles.length > 0
                ? user.roles.map((role) => (
                    <Badge key={role} tone="info">
                      {role}
                    </Badge>
                  ))
                : m.user_detail__no_role()}
            </dd>
          </div>
        </dl>
      </Panel>
      <Panel>
        <PanelHeader
          title={m.user_detail__workspace_access()}
          description={m.user_detail__workspace_description()}
        />
        {user.workspaces.length > 0 ? (
          <ul className="divide-y divide-border">
            {user.workspaces.map((workspace) => (
              <li className="flex items-center justify-between gap-4 px-5 py-3" key={workspace.id}>
                <div>
                  <Link
                    className="font-medium hover:underline"
                    params={{ id: workspace.id }}
                    to="/admin/workspaces/$id"
                  >
                    {workspace.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {workspace.id} · {m.user_detail__joined()}{" "}
                    {formatDate(workspace.joinedAt.toISOString())} · {workspace.projectCount}{" "}
                    {m.user_detail__projects()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    tone={workspace.operationalStatus === "suspended" ? "destructive" : "success"}
                  >
                    {workspace.operationalStatus}
                  </Badge>
                  <Badge tone="neutral">{workspace.role}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ConsoleEmptyState title={m.user_detail__no_workspaces()} />
        )}
      </Panel>
      <Panel>
        <PanelHeader
          title={m.user_detail__sessions()}
          description={m.user_detail__sessions_description()}
        />
        {user.sessions.length > 0 ? (
          <ul className="divide-y divide-border">
            {user.sessions.map((entry) => (
              <li className="px-5 py-3 text-sm" key={entry.id}>
                <p>{entry.userAgent ?? m.user_detail__unknown_device()}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.ipAddress ?? m.user_detail__ip_unavailable()} · {m.user_detail__expires()}{" "}
                  {formatDate(entry.expiresAt.toISOString())}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ConsoleEmptyState title={m.user_detail__no_sessions()} />
        )}
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={m.user_detail__recent_audit()} />
          {user.audit.length > 0 ? (
            <ul className="divide-y divide-border">
              {user.audit.map((event) => (
                <li className="px-5 py-3 text-sm" key={event.id}>
                  {event.action}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDate(event.createdAt.toISOString())}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ConsoleEmptyState title={m.user_detail__no_audit()} />
          )}
        </Panel>
        <Panel>
          <PanelHeader title={m.user_detail__security_events()} />
          {user.securityEvents.length > 0 ? (
            <ul className="divide-y divide-border">
              {user.securityEvents.map((event) => (
                <li className="flex items-center justify-between px-5 py-3 text-sm" key={event.id}>
                  <span>{event.type}</span>
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
                </li>
              ))}
            </ul>
          ) : (
            <ConsoleEmptyState title={m.user_detail__no_security()} />
          )}
        </Panel>
      </div>
    </div>
  );
}
