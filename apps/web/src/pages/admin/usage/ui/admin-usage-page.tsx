import { useState } from "react";

import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";
import { client, orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Badge,
  ConsoleErrorState,
  formatNumber,
  Panel,
  PanelHeader,
  SectionHeading,
  StatTile
} from "@/shared/ui/console-kit";

export function AdminUsagePage() {
  const [workspaceId, setWorkspaceId] = useState<string>();
  const [metric, setMetric] = useState<string>();
  const [period, setPeriod] = useState("30d");
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - Number.parseInt(period, 10));
  const query = useQuery(orpc.admin.usage.aggregates.queryOptions({ input: { organizationId: workspaceId ?? "", from: rangeStart, to: rangeEnd }, enabled: Boolean(workspaceId) }));
  const credits = useQuery(orpc.admin.usage.credits.queryOptions({ input: { organizationId: workspaceId ?? "" }, enabled: Boolean(workspaceId) }));
  const [adjustment, setAdjustment] = useState("0");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const adjust = useMutation({
    mutationFn: () => client.admin.usage.credit({ organizationId: workspaceId!, operation: "adjust", amount: Number(adjustment), reason, idempotencyKey: crypto.randomUUID() }),
    onSuccess: () => {
      setAdjustment("0");
      setReason("");
      void queryClient.invalidateQueries({ queryKey: orpc.admin.usage.credits.queryKey({ input: { organizationId: workspaceId! } }) });
    }
  });

  if (query.isError || credits.isError) return <ConsoleErrorState description={m.admin_usage__load_error()} onRetry={() => { void query.refetch(); void credits.refetch(); }} />;
  const rows = (query.data ?? []).filter((row) => !metric || row.metric === metric);
  const balance = credits.data?.account?.balance ?? 0;
  const total = rows.reduce((sum, row) => sum + Number(row.quantity), 0);
  const remaining = rows.some((row) => row.remaining !== null) ? rows.reduce((sum, row) => sum + Number(row.remaining ?? 0), 0) : null;
  return <div className="space-y-8">
    <SectionHeading eyebrow={m.admin_nav__platform()} title={m.admin_usage__title()} description={m.admin_usage__description()} />
    <div className="flex flex-wrap gap-3" aria-label={m.admin_usage__filters()}>
      <Input className="max-w-xs" placeholder={m.admin_usage__workspace_placeholder()} value={workspaceId ?? ""} onChange={(event) => setWorkspaceId(event.target.value || undefined)} />
      <Input className="max-w-xs" placeholder={m.admin_usage__metric_placeholder()} value={metric ?? ""} onChange={(event) => setMetric(event.target.value || undefined)} />
      <select aria-label={m.admin_usage__period()} className="h-9 rounded-md border bg-background px-2 text-sm" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7d">{m.admin_usage__last_7_days()}</option><option value="30d">{m.admin_usage__last_30_days()}</option><option value="90d">{m.admin_usage__last_90_days()}</option></select>
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><StatTile label={m.admin_usage__total()} value={formatNumber(total)} /><StatTile label={m.admin_usage__remaining()} value={remaining === null ? m.admin_usage__not_available() : formatNumber(remaining)} /><StatTile label={m.admin_usage__credit_balance()} value={formatNumber(balance)} /></div>
    <Panel><PanelHeader title={m.admin_usage__metrics()} /><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="px-5 py-3">{m.admin_usage__workspace()}</th><th className="px-5 py-3">{m.admin_usage__metric()}</th><th className="px-5 py-3">{m.admin_usage__used()}</th><th className="px-5 py-3">{m.admin_usage__limit()}</th><th className="px-5 py-3">{m.admin_usage__remaining()}</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={`${row.organizationId}-${row.metric}-${row.periodStart}`}><td className="px-5 py-3">{row.organizationId}</td><td className="px-5 py-3">{row.metric}</td><td className="px-5 py-3">{formatNumber(row.quantity)}</td><td className="px-5 py-3">{row.limit === null ? m.admin_usage__not_available() : formatNumber(row.limit)}</td><td className="px-5 py-3"><Badge tone={row.remaining !== null && row.remaining <= 0 ? "destructive" : "success"}>{row.remaining === null ? m.admin_usage__not_available() : formatNumber(row.remaining)}</Badge></td></tr>)}</tbody></table>{rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{m.admin_usage__empty()}</p> : null}</div></Panel>
    <Panel><PanelHeader title={m.admin_usage__credits()} description={m.admin_usage__ledger_description()} /><div className="space-y-3 p-5"><div className="flex flex-wrap gap-2"><Input aria-label={m.admin_usage__adjustment()} type="number" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} /><Input aria-label={m.admin_usage__reason()} placeholder={m.admin_usage__reason_placeholder()} value={reason} onChange={(event) => setReason(event.target.value)} /><Button disabled={!workspaceId || !reason.trim() || Number(adjustment) === 0 || adjust.isPending} onClick={() => { if (window.confirm(m.admin_usage__confirm_adjustment())) adjust.mutate(); }}>{m.admin_usage__adjust()}</Button></div><ul className="divide-y">{(credits.data?.ledger ?? []).map((entry) => <li className="flex justify-between gap-3 py-2 text-sm" key={entry.id}><span>{entry.operation}</span><span className="tabular-nums">{entry.amount > 0 ? "+" : ""}{formatNumber(entry.amount)}</span></li>)}</ul></div></Panel>
  </div>;
}
