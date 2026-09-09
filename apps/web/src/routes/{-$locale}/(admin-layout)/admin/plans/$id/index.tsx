import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";

import { generateAppSeo } from "@/shared/lib/seo";

import { AdminPlanDetailPage } from "@/pages/admin/plans/ui/admin-plan-detail-page";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/plans/$id/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.platform.plans.queryOptions()),
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/admin/plans/${params.id}`, locale: params.locale },
      description: "Review plan catalog settings and included capabilities.",
      robots: { follow: false, index: false },
      title: "Plan details"
    }),
  component: () => <AdminPlanDetailPage id={Route.useParams().id} />
});
