import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";

import { ProjectsPage } from "@/pages/console/projects";
export const Route = createFileRoute("/{-$locale}/(console-layout)/app/projects/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(orpc.console.projects.list.queryOptions({ input: {} })),
  component: ProjectsPage
});
