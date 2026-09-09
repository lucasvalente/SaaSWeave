import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client, orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";

import { ConfirmActionDialog } from "@/shared/ui/confirm-action-dialog";
import { ConsoleErrorState, ConsoleSkeleton, Panel, SectionHeading } from "@/shared/ui/console-kit";

export function AdminProjectDetailPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery(orpc.admin.projects.get.queryOptions({ input: { projectId } }));
  const archive = useMutation({
    mutationFn: () => client.admin.projects.archive({ projectId }),
    onError: () => toast.error(m.project__permission_denied()),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: orpc.admin.projects.get.queryKey({ input: { projectId } })
      });
      toast.success(m.project__archived_toast());
    }
  });
  if (query.isError)
    {return (
      <ConsoleErrorState description={m.project__not_found()} onRetry={() => query.refetch()} />
    );}
  if (!query.data) return <ConsoleSkeleton />;
  const project = query.data;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.project__platform()}
        title={project.name}
        description={project.description || m.project__not_found()}
      />
      <Panel>
        <dl className="grid gap-4 p-5 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{m.project__id()}</dt>
            <dd>{project.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.workspaces__status()}</dt>
            <dd>{project.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__workspace()}</dt>
            <dd>{project.workspaceName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__workspace_owner()}</dt>
            <dd>{project.workspaceOwner ?? m.project__no_owner()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__created_by()}</dt>
            <dd>
              {project.creatorName} · {project.creatorEmail}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__slug()}</dt>
            <dd>{project.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__created()}</dt>
            <dd>{project.createdAt.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__updated()}</dt>
            <dd>{project.updatedAt.toLocaleString()}</dd>
          </div>
        </dl>
        {project.status !== "archived" ? (
          <div className="border-t p-5">
            <ConfirmActionDialog
              confirmLabel={m.project__archive()}
              description={m.project__archive_description()}
              onConfirm={() => archive.mutate()}
              title={m.project__archive_confirm()}
            >
              <Button disabled={archive.isPending} variant="destructive">
                {m.project__archive()}
              </Button>
            </ConfirmActionDialog>
          </div>
        ) : null}
      </Panel>
      <Panel>
        <h2 className="p-5 font-medium">{m.project__workspace_access()}</h2>
        <ul className="divide-y">
          {project.members.map((entry) => (
            <li className="p-5 text-sm" key={entry.email}>
              {entry.name} · {entry.email} · {entry.role} · {m.project__joined()}{" "}
              {entry.joinedAt.toLocaleDateString()}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel>
        <h2 className="p-5 font-medium">{m.project__activity()}</h2>
        <ul className="divide-y">
          {project.activity.map((entry, index) => (
            <li className="p-5 text-sm" key={`${entry.action}-${index}`}>
              {entry.action} · {entry.actorName ?? m.project__system()} ·{" "}
              {entry.createdAt.toLocaleString()}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
