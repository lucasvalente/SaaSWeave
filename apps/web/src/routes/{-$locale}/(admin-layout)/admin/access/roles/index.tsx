import { createFileRoute } from "@tanstack/react-router";

import { AdminRolesPage } from "@/pages/admin/operations";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/access/roles/")({
  component: AdminRolesPage
});
