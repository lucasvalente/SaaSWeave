import { useQuery } from "@tanstack/react-query";
import { m } from "@saasweave/i18n/messages";
import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { ConsoleErrorState, ConsoleSkeleton, Panel, PanelHeader } from "@/shared/ui/console-kit";

export function AdminJobDetail({ jobId, queue }: { jobId: string; queue: string }) {
  const query = useQuery(orpc.admin.system.job.queryOptions({ input: { jobId, queue } }));
  if (query.isError) return <ConsoleErrorState description={m.console_batch_jobs__error_description()} onRetry={() => query.refetch()} />;
  if (!query.data) return <ConsoleSkeleton />;
  const job = query.data;
  return <Panel><PanelHeader title={`${m.console_batch_jobs__title()} · ${String(job.id)}`} description={String(job.name)} />
    <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Queue</dt><dd>{String(job.queue)}</dd></div>
      <div><dt className="text-muted-foreground">State</dt><dd>{String(job.state)}</dd></div>
      <div><dt className="text-muted-foreground">Attempts</dt><dd>{String(job.attemptsMade)} / {String(job.attempts)}</dd></div>
      {job.failedReason ? <div className="sm:col-span-2"><dt className="text-muted-foreground">Error</dt><dd className="break-words">{String(job.failedReason)}</dd></div> : null}
    </dl>
  </Panel>;
}
