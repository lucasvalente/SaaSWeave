import { createFileRoute } from "@tanstack/react-router";
import { AdminUsagePage } from "@/pages/admin/usage";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/usage/")({ component: AdminUsagePage });
