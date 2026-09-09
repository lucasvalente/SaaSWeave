import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { m } from "@saasweave/i18n/messages";
import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { Input } from "@saasweave/ui/components/input";
import { Badge, ConsoleEmptyState, ConsoleErrorState, ConsoleSkeleton, formatCurrency, formatDate, Panel, PanelHeader, SectionHeading } from "@/shared/ui/console-kit";

function invoiceStatusLabel(status: string) {
  if (status === "draft") return m.billing__invoice_status_draft();
  if (status === "open") return m.billing__invoice_status_open();
  if (status === "paid") return m.billing__invoice_status_paid();
  if (status === "void") return m.billing__invoice_status_void();
  return status;
}

type Invoice = { id: string; number: string; status: string; totalMinor: number; dueAt: string | null };

export function AdminBillingInvoicesPage() {
  const [organizationId, setOrganizationId] = useState("");
  const query = useQuery(orpc.admin.billing.invoices.queryOptions({ input: { organizationId, limit: 100 }, enabled: organizationId.trim().length > 0 }));
  const invoices = (query.data ?? []) as unknown as Invoice[];
  return <div className="space-y-8"><SectionHeading eyebrow={m.console_common__billing_eyebrow()} title={m.console_billing__invoices_title()} description={m.console_billing__invoices_description()} /><Input aria-label={m.subscriptions__workspace()} placeholder={m.subscriptions__select_workspace()} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} />{query.isError ? <ConsoleErrorState description={m.console_billing__error_description()} onRetry={() => void query.refetch()} /> : query.isFetching ? <ConsoleSkeleton /> : invoices.length ? <Panel><PanelHeader title={m.console_billing__invoices_title()} /><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="px-5 py-3">{m.console_common__invoice()}</th><th className="px-5 py-3">{m.subscriptions__status()}</th><th className="px-5 py-3">{m.plans__mrr()}</th><th className="px-5 py-3">{m.subscriptions__period_end()}</th></tr></thead><tbody className="divide-y">{invoices.map((invoice) => <tr key={invoice.id}><td className="px-5 py-3"><Link className="font-medium text-brand hover:underline" to="/admin/billing/invoices/$id" params={{ id: invoice.id }}>{invoice.number}</Link></td><td className="px-5 py-3"><Badge tone={invoice.status === "paid" ? "success" : invoice.status === "void" ? "destructive" : "warning"}>{invoiceStatusLabel(invoice.status)}</Badge></td><td className="px-5 py-3">{formatCurrency(invoice.totalMinor / 100)}</td><td className="px-5 py-3">{invoice.dueAt ? formatDate(String(invoice.dueAt)) : "—"}</td></tr>)}</tbody></table></div></Panel> : <ConsoleEmptyState title={m.console_billing__empty_invoices_title()} description={organizationId ? m.console_billing__empty_invoices_description() : m.subscriptions__select_workspace()} />}</div>;
}
