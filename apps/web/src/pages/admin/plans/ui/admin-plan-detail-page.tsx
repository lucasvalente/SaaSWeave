import { Link } from "@tanstack/react-router";

import { m } from "@saasweave/i18n/messages";

import { useGetPlansQuery } from "@/shared/api/get-plans.query";
import {
  Badge,
  ConsoleErrorState,
  ConsoleSkeleton,
  formatCurrency,
  formatNumber,
  Panel,
  PanelHeader,
  SectionHeading
} from "@/shared/ui/console-kit";

import  { type PlanRow } from "@/pages/admin/plans/ui/plan-editor";
import { EditPlanSheet } from "@/pages/admin/plans/ui/plan-editor";

export function AdminPlanDetailPage({ id }: { id: string }) {
  const query = useGetPlansQuery();
  if (query.isError) {
    return (
      <ConsoleErrorState
        description={m.plans__create_failed()}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  const plan = query.data.find((entry) => entry.id === id) as PlanRow | undefined;
  if (!plan) {
    return (
      <ConsoleErrorState description={m.plans__in_use()} onRetry={() => void query.refetch()} />
    );
  }
  return (
    <div className="space-y-8">
      <Link className="text-sm text-muted-foreground hover:text-foreground" to="/admin/plans">
        ← {m.plans__back_to_catalog()}
      </Link>
      <SectionHeading
        eyebrow={m.admin_nav__plans_catalog()}
        title={plan.name}
        description={m.plans__details_description()}
        action={<EditPlanSheet plan={plan} />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={m.plans__details()} />
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{m.plans__plan_id()}</dt>
              <dd className="mt-1 font-mono text-sm">{plan.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{m.plans__name()}</dt>
              <dd className="mt-1 text-sm">{plan.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{m.plans__price_month()}</dt>
              <dd className="mt-1 text-sm">
                {plan.priceMonthly === null ? m.plans__custom() : formatCurrency(plan.priceMonthly)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{m.plans__seats_included()}</dt>
              <dd className="mt-1 text-sm">{formatNumber(plan.seatsIncluded)}</dd>
            </div>
          </dl>
        </Panel>
        <Panel>
          <PanelHeader
            title={m.plans__entitlements()}
            description={m.plans__entitlements_description()}
          />
          <ul className="space-y-2 p-5">
            {plan.highlights.map((highlight) => (
              <li className="flex items-center gap-2 text-sm" key={highlight}>
                <Badge tone="success">✓</Badge>
                {highlight}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
