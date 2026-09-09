import { createFileRoute } from "@tanstack/react-router";
import { AdminBillingInvoicesPage } from "@/pages/admin/billing";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/billing/invoices/")({ component: AdminBillingInvoicesPage });
