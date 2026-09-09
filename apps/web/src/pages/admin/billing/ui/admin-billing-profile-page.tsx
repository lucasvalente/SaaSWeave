import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { m } from "@saasweave/i18n/messages";
import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { Input } from "@saasweave/ui/components/input";
import { ConsoleEmptyState, ConsoleErrorState, ConsoleSkeleton, Panel, PanelHeader, SectionHeading } from "@/shared/ui/console-kit";

export function AdminBillingProfilePage() {
  const [organizationId, setOrganizationId] = useState("");
  const query = useQuery(orpc.admin.billing.profile.queryOptions({ input: { organizationId }, enabled: organizationId.trim().length > 0 }));
  return <div className="space-y-8"><SectionHeading eyebrow={m.console_common__billing_eyebrow()} title={m.console_settings__account_title()} description={m.console_settings__account_description()} /><Input aria-label={m.subscriptions__workspace()} placeholder={m.subscriptions__select_workspace()} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} />{query.isError ? <ConsoleErrorState description={m.console_billing__error_description()} onRetry={() => void query.refetch()} /> : query.isFetching ? <ConsoleSkeleton /> : query.data ? <Panel><PanelHeader title={m.console_settings__account_title()} /><dl className="grid gap-4 p-5 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">{m.console_settings__workspace_name_label()}</dt><dd className="font-medium">{query.data.legalName ?? "—"}</dd></div><div><dt className="text-xs text-muted-foreground">{m.console_profile__title()}</dt><dd className="font-medium">{query.data.billingEmail ?? "—"}</dd></div><div><dt className="text-xs text-muted-foreground">{m.console_settings__sso_provider_id_label()}</dt><dd className="font-medium">{query.data.taxId ?? "—"}</dd></div></dl></Panel> : <ConsoleEmptyState title={m.subscriptions__select_workspace()} />}</div>;
}
