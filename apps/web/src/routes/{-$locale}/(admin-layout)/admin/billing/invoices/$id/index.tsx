import { createFileRoute } from "@tanstack/react-router";
import { AdminBillingInvoiceDetailPage } from "@/pages/admin/billing";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/billing/invoices/$id/")({ component: () => <AdminBillingInvoiceDetailPage id={Route.useParams().id} /> });
