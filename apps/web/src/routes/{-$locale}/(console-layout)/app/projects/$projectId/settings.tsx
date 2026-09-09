import { createFileRoute } from "@tanstack/react-router";

import { ProjectSettingsPage } from "@/pages/console/projects";
export const Route = createFileRoute(
  "/{-$locale}/(console-layout)/app/projects/$projectId/settings"
)({ component: () => <ProjectSettingsPage projectId={Route.useParams().projectId} /> });
