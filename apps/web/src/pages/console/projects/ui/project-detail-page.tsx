import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";
import { formatDateTime } from "@saasweave/i18n/tanstack-start/locale-formatters";

import { ConsoleErrorState, ConsoleSkeleton, Panel, SectionHeading } from "@/shared/ui/console-kit";
import { projectStatusLabel } from "./project-status";

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const query = useQuery(orpc.console.projects.get.queryOptions({ input: { projectId } }));
  if (query.isError)
    {return (
      <ConsoleErrorState description={m.project__not_found()} onRetry={() => query.refetch()} />
    );}
  if (!query.data) return <ConsoleSkeleton />;
  const project = query.data;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin_nav__projects()}
        title={project.name}
        description={project.description ?? m.project__description()}
      />
      <Panel>
        <dl className="grid gap-4 p-5 text-sm">
          <div>
            <dt className="text-muted-foreground">{m.project__workspace()}</dt>
            <dd>{project.workspaceName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__created_by()}</dt>
            <dd>{project.createdByName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.workspaces__status()}</dt>
            <dd>{projectStatusLabel(project.status)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__created()}</dt>
            <dd>{formatDateTime(project.createdAt.toISOString())}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{m.project__updated()}</dt>
            <dd>{formatDateTime(project.updatedAt.toISOString())}</dd>
          </div>
        </dl>
        <div className="flex gap-4 border-t p-5">
          <Link
            className="text-sm font-medium hover:underline"
            params={{ projectId }}
            to="/app/projects/$projectId/build"
          >
            {m.customer_project__open_builder()}
          </Link>
          <Link
            className="text-sm font-medium hover:underline"
            params={{ projectId }}
            to="/app/projects/$projectId/settings"
          >
            {m.customer_project__settings()}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
