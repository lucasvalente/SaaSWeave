import { createFileRoute } from "@tanstack/react-router";

import { AdminProjectDetailPage } from "@/pages/admin/projects";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/projects/$projectId/")({
  component: () => <AdminProjectDetailPage projectId={Route.useParams().projectId} />
});
