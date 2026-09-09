import { createFileRoute } from "@tanstack/react-router";

import { AdminSecurityEventsPage } from "@/pages/admin/operations";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/security/events/")({
  component: AdminSecurityEventsPage
});
