import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { m } from "@saasweave/i18n/messages";
import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { Input } from "@saasweave/ui/components/input";
import { Badge, ConsoleErrorState, ConsoleSkeleton, formatCurrency, formatDate, Panel, PanelHeader, SectionHeading } from "@/shared/ui/console-kit";

function invoiceStatusLabel(status: string) {
  if (status === "draft") return m.billing__invoice_status_draft();
  if (status === "open") return m.billing__invoice_status_open();
  if (status === "paid") return m.billing__invoice_status_paid();
  if (status === "void") return m.billing__invoice_status_void();
  return status;
}

type Invoice = { number: string; status: string; totalMinor: number; dueAt: string | null; lines: Array<{ id: string; description: string; quantity: number; totalMinor: number }> };

export function AdminBillingInvoiceDetailPage({ id }: { id: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const query = useQuery(orpc.admin.billing.invoice.queryOptions({ input: { organizationId, id }, enabled: organizationId.trim().length > 0 }));
  const invoice = query.data as unknown as Invoice | undefined;
  return <div className="space-y-8"><SectionHeading eyebrow={m.console_common__billing_eyebrow()} title={m.console_common__invoice()} description={m.console_billing__invoices_description()} /><Input aria-label={m.subscriptions__workspace()} placeholder={m.subscriptions__select_workspace()} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} />{query.isError ? <ConsoleErrorState description={m.console_billing__error_description()} onRetry={() => void query.refetch()} /> : query.isFetching ? <ConsoleSkeleton /> : invoice ? <Panel><PanelHeader title={invoice.number} action={<Badge tone={invoice.status === "paid" ? "success" : "warning"}>{invoiceStatusLabel(invoice.status)}</Badge>} /><dl className="grid gap-4 p-5 sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">{m.plans__mrr()}</dt><dd className="font-medium">{formatCurrency(invoice.totalMinor / 100)}</dd></div><div><dt className="text-xs text-muted-foreground">{m.subscriptions__period_end()}</dt><dd className="font-medium">{invoice.dueAt ? formatDate(String(invoice.dueAt)) : "—"}</dd></div><div><dt className="text-xs text-muted-foreground">{m.subscriptions__status()}</dt><dd className="font-medium">{invoiceStatusLabel(invoice.status)}</dd></div></dl><ul className="divide-y border-t">{invoice.lines.map((line) => <li className="flex justify-between gap-4 px-5 py-3 text-sm" key={line.id}><span>{line.description} × {line.quantity}</span><span>{formatCurrency(line.totalMinor / 100)}</span></li>)}</ul></Panel> : null}</div>;
}
