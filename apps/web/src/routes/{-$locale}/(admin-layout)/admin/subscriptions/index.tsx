import { createFileRoute } from "@tanstack/react-router";
import { AdminSubscriptionsPage } from "@/pages/admin/subscriptions";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/subscriptions/")({ component: AdminSubscriptionsPage });
