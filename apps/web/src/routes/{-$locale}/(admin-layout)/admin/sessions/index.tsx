import { createFileRoute } from "@tanstack/react-router";

import { AdminSessionsPage } from "@/pages/admin/operations";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/sessions/")({
  component: AdminSessionsPage
});
