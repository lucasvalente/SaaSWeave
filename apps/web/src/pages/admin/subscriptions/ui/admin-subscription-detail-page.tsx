import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { m } from "@saasweave/i18n/messages";
import { Badge, ConsoleErrorState, ConsoleSkeleton, formatDate, formatNumber, Panel, PanelHeader, SectionHeading } from "@/shared/ui/console-kit";
import { client, orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { useGetPlansQuery } from "@/shared/api/get-plans.query";
import { Button } from "@saasweave/ui/components/button";
import { useState } from "react";
type Detail = Awaited<ReturnType<typeof client.admin.subscriptions.get>>;
function statusLabel(status: string) {
 if (status === "active") return m.subscriptions__active();
 if (status === "trialing") return m.subscriptions__trialing();
 if (status === "past_due") return m.subscriptions__past_due();
 return m.subscriptions__canceled();
}
export function AdminSubscriptionDetailPage({ id }: { id: string }) {
 const query = useQuery(orpc.admin.subscriptions.get.queryOptions({ input: { id } }));
 const history = useQuery(orpc.admin.subscriptions.history.queryOptions({ input: { id } }));
 const plans = useGetPlansQuery();
 const queryClient = useQueryClient();
 const [planId, setPlanId] = useState("");
 const change = useMutation({
  mutationFn: (nextPlanId: string) => client.admin.subscriptions.change({ id, planId: nextPlanId }),
  onSuccess: async () => {
   setPlanId("");
   await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.admin.subscriptions.get.queryKey({ input: { id } }) }),
    queryClient.invalidateQueries({ queryKey: orpc.admin.subscriptions.history.queryKey({ input: { id } }) })
   ]);
  }
 });
 if (query.isError) return <ConsoleErrorState description={m.subscriptions__load_error()} onRetry={() => void query.refetch()} />;
 if (!query.data) return <ConsoleSkeleton />;
 const sub = query.data as Detail;
 return <div className="space-y-8"><Link className="text-sm text-muted-foreground hover:text-foreground" to="/admin/subscriptions">← {m.subscriptions__back()}</Link><SectionHeading title={m.subscriptions__detail()} description={sub.organizationName ?? sub.organizationId} /><Panel><PanelHeader title={m.subscriptions__summary()} /><dl className="grid gap-4 p-5 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">{m.subscriptions__plan()}</dt><dd>{sub.planId}</dd></div><div><dt className="text-xs text-muted-foreground">{m.subscriptions__status()}</dt><dd><Badge>{statusLabel(sub.status)}</Badge></dd></div><div><dt className="text-xs text-muted-foreground">{m.subscriptions__seats()}</dt><dd>{formatNumber(sub.seats)}</dd></div><div><dt className="text-xs text-muted-foreground">{m.subscriptions__period_end()}</dt><dd>{sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}</dd></div></dl><div className="flex flex-wrap items-end gap-2 border-t p-5"><label className="flex flex-col gap-1 text-sm"><span className="text-xs text-muted-foreground">{m.subscriptions__change()}</span><select aria-label={m.subscriptions__change()} className="h-9 rounded-md border bg-background px-2" value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">{m.subscriptions__select_plan()}</option>{plans.data?.filter((plan) => plan.id !== sub.planId && plan.status !== "archived").map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><Button size="sm" disabled={!planId || change.isPending} onClick={() => change.mutate(planId)}>{change.isPending ? m.subscriptions__changing() : m.subscriptions__change()}</Button></div></Panel><Panel><PanelHeader title={m.subscriptions__history()} /><ul className="divide-y p-5">{(history.data ?? []).map((entry) => <li className="py-2 text-sm" key={entry.id}>{entry.action} · {formatDate(entry.createdAt)}</li>)}</ul></Panel></div>;
}
