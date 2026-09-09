import { createFileRoute } from "@tanstack/react-router";

import { AdminFeaturesPage } from "@/pages/admin/features";
export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/feature-flags/")({
  component: AdminFeaturesPage
});
