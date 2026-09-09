import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";

import { ProjectDetailPage } from "@/pages/console/projects";
export const Route = createFileRoute("/{-$locale}/(console-layout)/app/projects/$projectId/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      orpc.console.projects.get.queryOptions({ input: { projectId: params.projectId } })
    ),
  component: () => <ProjectDetailPage projectId={Route.useParams().projectId} />
});
