import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { AdminUserDetailPage } from "@/pages/admin/users";
import { getUserDetailQueryOptions } from "@/pages/admin/users/api/get-user-detail.query";

export const Route = createFileRoute("/{-$locale}/(admin-layout)/admin/users/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(getUserDetailQueryOptions(params.id)),
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: `/admin/users/${params.id}`, locale: params.locale },
      description: "Platform user profile and security context.",
      robots: { follow: false, index: false },
      title: "User detail"
    }),
  component: RouteComponent
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <AdminUserDetailPage id={id} />;
}
