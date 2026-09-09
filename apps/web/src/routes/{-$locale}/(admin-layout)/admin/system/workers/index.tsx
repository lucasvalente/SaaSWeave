import { createFileRoute } from "@tanstack/react-router";
import { AdminWorkers } from "@/features/admin-system/ui/admin-operations-panels";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/system/workers/")({ component: AdminWorkers });
