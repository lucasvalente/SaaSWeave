import { createFileRoute } from "@tanstack/react-router";

import { AdminHealth } from "@/features/admin-monitoring";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/system/health/")({
  component: AdminHealth
});
