import { createFileRoute } from "@tanstack/react-router";
import { AdminIncidents } from "@/features/admin-system/ui/admin-operations-panels";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/system/incidents/")({ component: AdminIncidents });
