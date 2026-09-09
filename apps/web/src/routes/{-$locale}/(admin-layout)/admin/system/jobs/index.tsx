import { createFileRoute } from "@tanstack/react-router";
import { AdminJobs } from "@/features/admin-system/ui/admin-jobs";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/system/jobs/")({ component: AdminJobs });
