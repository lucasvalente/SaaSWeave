import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";
import { AdminBillingPage } from "@/pages/admin/billing";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/billing/")({
  head: ({ params }) => generateAppSeo({
    alternates: { canonicalPath: "/admin/billing", locale: params.locale },
    description: "Platform billing operations and plan performance.",
    robots: { follow: false, index: false },
    title: "Billing"
  }),
  component: AdminBillingPage
});
