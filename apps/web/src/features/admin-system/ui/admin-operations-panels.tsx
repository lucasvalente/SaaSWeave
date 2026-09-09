import { useQuery } from "@tanstack/react-query";
import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";
import { Panel, PanelHeader, ConsoleErrorState, ConsoleSkeleton } from "@/shared/ui/console-kit";

export function AdminWorkers() {
  const q = useQuery(orpc.admin.system.workers.queryOptions());
  if (q.isLoading) return <ConsoleSkeleton />;
  if (q.isError) return <ConsoleErrorState description={m.admin_monitoring__health_error()} onRetry={() => q.refetch()} />;
  return <Panel><PanelHeader title={m.admin_system__workers_title()} />{q.data?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3">{m.admin_system__worker_id()}</th><th className="p-3">{m.admin_system__worker_queue()}</th><th className="p-3">{m.admin_system__worker_address()}</th><th className="p-3">{m.admin_system__worker_age()}</th><th className="p-3">{m.admin_system__worker_idle()}</th></tr></thead><tbody>{q.data.map((worker) => <tr className="border-b" key={`${String(worker.queue)}:${String(worker.id)}`}><td className="p-3 font-mono">{String(worker.id)}</td><td className="p-3">{String(worker.queue)}</td><td className="p-3">{String(worker.address ?? "—")}</td><td className="p-3">{String(worker.age ?? "—")}</td><td className="p-3">{String(worker.idle ?? "—")}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-muted-foreground">{m.admin_system__workers_empty()}</p>}</Panel>;
}
export function AdminIncidents() {
  const q = useQuery(orpc.admin.system.incidents.queryOptions({ input: { limit: 50 } }));
  if (q.isLoading) return <ConsoleSkeleton />;
  if (q.isError) return <ConsoleErrorState description={m.admin_monitoring__health_error()} onRetry={() => q.refetch()} />;
  return <Panel><PanelHeader title={m.admin_system__incidents_title()} />{q.data?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3">{m.admin_system__incident_type()}</th><th className="p-3">{m.admin_system__incident_severity()}</th><th className="p-3">{m.admin_system__incident_message()}</th><th className="p-3">{m.admin_system__incident_occurred()}</th></tr></thead><tbody>{q.data.map((incident) => <tr className="border-b" key={String(incident.id)}><td className="p-3">{String(incident.type)}</td><td className="p-3">{String(incident.severity)}</td><td className="p-3">{String(incident.message)}</td><td className="p-3">{String(incident.occurredAt ?? "—")}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-muted-foreground">{m.admin_system__incidents_empty()}</p>}</Panel>;
}
