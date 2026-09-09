import { Link } from "@tanstack/react-router";

import { m } from "@saasweave/i18n/messages";
import {
  Badge,
  ConsoleErrorState,
  ConsoleSkeleton,
  formatCurrency,
  formatNumber,
  Panel,
  PanelHeader,
  SectionHeading,
  StatTile
} from "@/shared/ui/console-kit";
import { useGetPlansQuery } from "@/shared/api/get-plans.query";
import { useGetPlatformStatsQuery } from "@/pages/admin/api/get-platform-stats.query";

/**
 * Provider-agnostic billing control surface. Payment gateways and checkout are
 * deliberately not coupled to this view; operational data comes from the
 * canonical plans, subscriptions and platform analytics APIs.
 */
export function AdminBillingPage() {
  const stats = useGetPlatformStatsQuery();
  const plans = useGetPlansQuery();

  if (stats.isError || plans.isError) {
    return <ConsoleErrorState description={m.console_billing__error_description()} onRetry={() => { void stats.refetch(); void plans.refetch(); }} />;
  }
  if (!stats.data || !plans.data) return <ConsoleSkeleton />;

  const mrr = stats.data.kpis.find((kpi) => kpi.key.toLowerCase().includes("mrr"));
  const activePlans = plans.data.filter((plan) => plan.status !== "archived");

  return (
    <div className="space-y-8" data-testid="admin-billing-page">
      <SectionHeading
        eyebrow={m.console_common__billing_eyebrow()}
        title={m.console_billing__title()}
        description={m.console_billing__description()}
        action={<Link className="text-sm font-medium text-brand hover:underline" to="/admin/subscriptions">{m.subscriptions__title()}</Link>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={m.plans__mrr()} value={mrr ? formatCurrency(mrr.value) : formatCurrency(0)} />
        <StatTile label={m.admin_nav__workspaces()} value={formatNumber(stats.data.totalWorkspaces)} />
        <StatTile label={m.plans__active()} value={formatNumber(activePlans.length)} />
        <StatTile label={m.console_billing__invoices_title()} value="0" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title={m.console_billing__plans_title()} description={m.console_billing__plans_description()} />
          <div className="divide-y divide-border">
            {activePlans.map((plan) => {
              const distribution = stats.data.planDistribution.find((item) => item.planId === plan.id);
              return (
                <div className="flex items-center justify-between gap-4 px-5 py-4" key={plan.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-medium text-foreground">{plan.priceMonthly === null ? m.plans__custom() : formatCurrency(plan.priceMonthly)}</p>
                      <p className="text-xs text-muted-foreground">{distribution ? `${formatNumber(distribution.customers)} ${m.plans__subscribers()}` : m.subscriptions__all()}</p>
                    </div>
                    <Badge tone={plan.status === "archived" ? "neutral" : "success"}>{plan.status === "archived" ? m.plans__archived() : m.plans__active()}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={m.console_billing__invoices_title()} description={m.console_billing__invoices_description()} />
          <div className="p-5">
            <p className="text-sm font-medium text-foreground">{m.console_billing__empty_invoices_title()}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.console_billing__empty_invoices_description()}</p>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={m.console_billing__payment_method_title()} description={m.console_billing__add_payment_hint()} />
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm text-muted-foreground">{m.console_billing__no_payment_method()}</p>
          <Badge tone="neutral">{m.console_billing__sample_notice()}</Badge>
        </div>
      </Panel>
    </div>
  );
}
