import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { ProjectBuilderPage } from "@/pages/console/projects/ui/project-builder-page";

export const Route = createFileRoute("/{-$locale}/(console-layout)/app/projects/$projectId/build")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(orpc.console.projects.get.queryOptions({ input: { projectId: params.projectId } })),
  component: () => <ProjectBuilderPage projectId={Route.useParams().projectId} />
});
