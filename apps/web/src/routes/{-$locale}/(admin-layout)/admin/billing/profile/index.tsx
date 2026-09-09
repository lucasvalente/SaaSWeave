import { createFileRoute } from "@tanstack/react-router";
import { AdminBillingProfilePage } from "@/pages/admin/billing";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/billing/profile/")({ component: AdminBillingProfilePage });
