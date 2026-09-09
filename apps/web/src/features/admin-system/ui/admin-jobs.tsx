import { useQuery } from "@tanstack/react-query";
import { m } from "@saasweave/i18n/messages";
import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { ConsoleErrorState, ConsoleSkeleton, Panel, PanelHeader } from "@/shared/ui/console-kit";
import { Link } from "@tanstack/react-router";

export function AdminJobs() {
  const query = useQuery(orpc.admin.system.jobs.queryOptions({ input: { limit: 50 } }));
  if (query.isError) return <ConsoleErrorState description={m.console_batch_jobs__error_description()} onRetry={() => query.refetch()} />;
  if (!query.data) return <ConsoleSkeleton />;
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title={m.console_batch_jobs__title()} description={m.console_batch_jobs__list_description()} />
        {query.data.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">{m.console_batch_jobs__empty_title()}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="p-3">ID</th><th className="p-3">Queue</th><th className="p-3">Type</th><th className="p-3">Attempts</th><th className="p-3">State</th></tr></thead>
              <tbody>{query.data.map((job) => <tr className="border-b" key={`${String(job.queue)}:${String(job.id)}`}><td className="p-3 font-mono"><Link className="underline" to="/admin/system/jobs/$jobId" params={{ jobId: String(job.id) }} search={{ queue: String(job.queue) }}>{String(job.id)}</Link></td><td className="p-3">{String(job.queue)}</td><td className="p-3">{String(job.name)}</td><td className="p-3">{String(job.attemptsMade)}</td><td className="p-3">{job.failedReason ? m.console_batch_jobs__status_failed() : m.console_batch_jobs__status_pending()}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
