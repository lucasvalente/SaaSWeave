import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import { Badge, ConsoleErrorState, ConsoleSkeleton, formatDate, formatNumber, Panel, PanelHeader, SectionHeading } from "@/shared/ui/console-kit";
import { orpc, client } from "@saasweave/api/client/tanstack-start/orpc";
import { useState } from "react";
import { useGetPlansQuery } from "@/shared/api/get-plans.query";
import { useGetWorkspacesQuery } from "@/pages/admin/workspaces/api/get-workspaces.query";

type Subscription = Awaited<ReturnType<typeof client.admin.subscriptions.list>>["subscriptions"][number];
const tone: Record<string, "success" | "info" | "warning" | "destructive" | "neutral"> = { active: "success", trialing: "info", past_due: "warning", canceled: "destructive" };

function statusLabel(status: Subscription["status"]) {
  return status === "active" ? m.subscriptions__active() : status === "trialing" ? m.subscriptions__trialing() : status === "past_due" ? m.subscriptions__past_due() : m.subscriptions__canceled();
}

function AssignSubscription({ onDone }: { onDone: () => void }) {
  const plans = useGetPlansQuery();
  const workspaces = useGetWorkspacesQuery({ limit: 100 });
  const [organizationId, setOrganizationId] = useState("");
  const [planId, setPlanId] = useState("");
  const [seats, setSeats] = useState("1");
  const assign = useMutation({
    mutationFn: (input: { organizationId: string; planId: string; seats: number }) =>
      client.admin.subscriptions.assign({ ...input, status: "active" }),
    onSuccess: onDone
  });
  return <div className="flex flex-wrap items-end gap-2" aria-label={m.subscriptions__assign()}>
    <select aria-label={m.subscriptions__workspace()} className="h-9 rounded-md border bg-background px-2 text-sm" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}><option value="">{m.subscriptions__select_workspace()}</option>{workspaces.data?.workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}</select>
    <select aria-label={m.subscriptions__plan()} className="h-9 rounded-md border bg-background px-2 text-sm" value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="">{m.subscriptions__select_plan()}</option>{plans.data?.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
    <input aria-label={m.subscriptions__seats()} className="h-9 w-16 rounded-md border bg-background px-2 text-sm" min={1} type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
    <Button size="sm" disabled={!organizationId || !planId || assign.isPending} onClick={() => assign.mutate({ organizationId, planId, seats: Math.max(1, Number(seats) || 1) })}>{assign.isPending ? m.subscriptions__assigning() : m.subscriptions__assign()}</Button>
  </div>;
}

export function AdminSubscriptionsPage() {
  const query = useQuery(orpc.admin.subscriptions.list.queryOptions({ input: { limit: 50 } }));
  const queryClient = useQueryClient();
  const cancel = useMutation({ mutationFn: (id: string) => client.admin.subscriptions.cancel({ id }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: orpc.admin.subscriptions.list.queryKey({ input: { limit: 50 } }) }) });
  if (query.isError) return <ConsoleErrorState description={m.subscriptions__load_error()} onRetry={() => void query.refetch()} />;
  if (!query.data) return <ConsoleSkeleton />;
  return <div className="space-y-8"><SectionHeading eyebrow={m.admin_nav__platform()} title={m.subscriptions__title()} description={m.subscriptions__subtitle()} /><AssignSubscription onDone={() => void queryClient.invalidateQueries({ queryKey: orpc.admin.subscriptions.list.queryKey({ input: { limit: 50 } }) })} />
    <Panel><PanelHeader title={m.subscriptions__all()} /><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="px-5 py-3">{m.subscriptions__workspace()}</th><th className="px-5 py-3">{m.subscriptions__plan()}</th><th className="px-5 py-3">{m.subscriptions__status()}</th><th className="px-5 py-3">{m.subscriptions__seats()}</th><th className="px-5 py-3">{m.subscriptions__period_end()}</th><th className="px-5 py-3">{m.subscriptions__actions()}</th></tr></thead><tbody className="divide-y">
      {query.data.subscriptions.map((sub) => <tr key={sub.id}><td className="px-5 py-3"><Link className="font-medium hover:underline" to="/admin/subscriptions/$id" params={{ id: sub.id }}>{sub.organizationName ?? sub.organizationId}</Link></td><td className="px-5 py-3">{sub.planId}</td><td className="px-5 py-3"><Badge tone={tone[sub.status as keyof typeof tone]}>{statusLabel(sub.status as Subscription["status"])}</Badge></td><td className="px-5 py-3">{formatNumber(sub.seats)}</td><td className="px-5 py-3">{sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}</td><td className="px-5 py-3"><Button size="sm" variant="outline" disabled={sub.status === "canceled" || cancel.isPending} onClick={() => cancel.mutate(sub.id)}>{m.subscriptions__cancel()}</Button></td></tr>)}
    </tbody></table></div></Panel></div>;
}
