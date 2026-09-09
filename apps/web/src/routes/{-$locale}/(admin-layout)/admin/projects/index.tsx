import { createFileRoute } from "@tanstack/react-router";

import { AdminProjectsPage } from "@/pages/admin/projects";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/projects/")({
  component: AdminProjectsPage
});
