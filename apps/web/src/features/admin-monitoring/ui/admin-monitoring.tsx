import {
  ConsoleErrorState,
  ConsoleSkeleton,
  Panel,
  PanelHeader,
  StatTile
} from "@/shared/ui/console-kit";

import { useAdminHealth, useAdminOverview } from "@/features/admin-monitoring/api/monitoring.query";
import { m } from "@saasweave/i18n/messages";
import { Link } from "@saasweave/i18n/tanstack-start/components/link";

export function AdminHealth() {
  const query = useAdminHealth();
  if (query.isError) {
    return (
      <ConsoleErrorState
        description={m.admin_monitoring__health_error()}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  const statusLabel = (status: string) => status === "healthy" ? m.status__healthy() : status === "unhealthy" ? m.status__degraded() : status === "unconfigured" ? m.status__unreachable() : status;
  return (
    <Panel>
      <PanelHeader title={m.admin_nav__system_health()} description={`${m.admin_monitoring__checked()} ${query.data.checkedAt}`} />
      <dl className="grid gap-4 p-5 sm:grid-cols-5">
        {(["api", "postgres", "redis", "queue", "storage"] as const).map((name) => (
          <div key={name}>
            <dt className="capitalize">{name}</dt>
            <dd>
              {statusLabel(query.data[name].status)} · {query.data[name].latencyMs} ms
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
export function AdminOverview() {
  const query = useAdminOverview();
  if (query.isError) {
    return (
      <ConsoleErrorState
        description={m.admin_monitoring__totals_error()}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  const data = query.data;
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title={m.admin_home__quick_links()} description={m.admin_home__quick_links_description()} />
        <nav className="grid gap-2 p-5 sm:grid-cols-3" aria-label={m.admin_home__quick_links()}>
          {[
            ["/admin/users", m.admin_nav__users()],
            ["/admin/workspaces", m.admin_nav__workspaces()],
            ["/admin/projects", m.admin_nav__projects()],
            ["/admin/plans", m.admin_nav__plans_catalog()],
            ["/admin/subscriptions", m.subscriptions__title()],
            ["/admin/usage", m.admin_usage__title()]
          ].map(([to, label]) => <Link key={to} to={to as never} className="rounded-lg border border-border px-4 py-3 text-sm hover:border-brand-border">{label}</Link>)}
        </nav>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-5">
        {(["users", "workspaces", "sessions", "audit", "criticalSecurityEvents"] as const).map(
          (name) =>
            data[name] === null ? null : (
              <StatTile
                key={name}
                label={
                  {
                    users: m.admin_nav__users(),
                    workspaces: m.admin_nav__workspaces(),
                    sessions: m.admin_nav__sessions(),
                    audit: m.admin_nav__audit_log(),
                    criticalSecurityEvents: m.admin_nav__security_events()
                  }[name]
                }
                value={String(data[name])}
              />
            )
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {data.workspacesSummary && <StatTile label={m.admin_nav__workspaces()} value={`${data.workspacesSummary.active}/${data.workspacesSummary.total}`} />}
        {data.projectsSummary && <StatTile label={m.admin_nav__projects()} value={`${data.projectsSummary.active}/${data.projectsSummary.total}`} />}
        {data.subscriptionsSummary && <StatTile label={m.subscriptions__title()} value={String(data.subscriptionsSummary.active)} />}
        {data.billingSummary && <StatTile label={m.console_billing__invoices_title()} value={String(data.billingSummary.openInvoices)} />}
        {data.featureFlagsSummary && <StatTile label={m.admin_nav__feature_flags()} value={`${data.featureFlagsSummary.enabled}/${data.featureFlagsSummary.total}`} />}
      </div>
      {data.health && (
        <Panel>
          <PanelHeader title={m.admin_nav__system_health()} description={m.status__description()} />
          <p className="p-5">
            {(["api", "postgres", "redis", "queue", "storage"] as const)
              .map((name) => `${name}: ${data.health![name].status === "healthy" ? m.status__healthy() : data.health![name].status === "unhealthy" ? m.status__degraded() : m.status__unreachable()}`)
              .join(" · ")}
          </p>
        </Panel>
      )}
    </div>
  );
}
