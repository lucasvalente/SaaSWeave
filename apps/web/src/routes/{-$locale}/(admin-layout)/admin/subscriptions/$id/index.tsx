import { createFileRoute } from "@tanstack/react-router";
import { AdminSubscriptionDetailPage } from "@/pages/admin/subscriptions";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/subscriptions/$id/")({ component: () => <AdminSubscriptionDetailPage id={Route.useParams().id} /> });
