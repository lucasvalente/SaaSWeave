import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { getAuthStateQueryOptions } from "@saasweave/auth/react/tanstack-start/queries";
import { m } from "@saasweave/i18n/messages";
import { Link } from "@saasweave/i18n/tanstack-start/components/link";
import { redirect } from "@saasweave/i18n/tanstack-start/lib/redirect";
import { stripLocalePrefix } from "@saasweave/i18n/tanstack-start/lib/strip-locale-prefix";
import { validateNavigateTo } from "@saasweave/i18n/tanstack-start/lib/validate-navigate-to";
import { Button } from "@saasweave/ui/components/button";

import { Badge, ConsoleErrorState } from "@/shared/ui/console-kit";

import { getAllowedAdminNav, AdminCommandPalette } from "@/features/console-nav";

import { ConsoleLayout } from "@/widgets/console-layout";

import { routeTree } from "@/routeTree.gen";

export const Route = createFileRoute("/{-$locale}/(admin-layout)")({
  errorComponent: ({ reset }) => (
    <ConsoleErrorState description={m.admin_layout__error()} onRetry={reset} />
  ),
  beforeLoad: async ({ context, location, preload }) => {
    const state = await context.queryClient.ensureQueryData(
      preload
        ? getAuthStateQueryOptions()
        : { ...getAuthStateQueryOptions(), revalidateIfStale: true }
    );
    const user = state.user;

    if (!user) {
      if (preload) return;
      const currentHref = stripLocalePrefix(location.href);
      const redirectTo = validateNavigateTo({
        fallbackTo: "/",
        routeTree,
        shouldIncludeRoute: (route) => !route.id.includes("(guest)"),
        to: currentHref
      });
      throw redirect({ search: { redirect: redirectTo }, to: "/sign-in" });
    }

    const access = await context.queryClient.fetchQuery(orpc.admin.access.queryOptions());
    if (!access.permissions.includes("platform.dashboard.read")) {
      if (preload) return;
      throw redirect({ to: "/app" });
    }

    return { user, adminPermissions: access.permissions };
  },
  component: AdminLayoutRoute
});

function AdminLayoutRoute() {
  const { adminPermissions } = Route.useRouteContext();
  return (
    <ConsoleLayout
      groups={getAllowedAdminNav(adminPermissions ?? [])}
      homeTo="/admin/"
      ariaLabel={m.admin_layout__platform_admin()}
      badge={<Badge tone="brand">{m.admin_layout__platform_admin()}</Badge>}
      footer={
        <Link
          to="/app"
          className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-brand-border/70 hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {m.admin_layout__back_to_workspace()}
        </Link>
      }
      actions={
        <>
          <AdminCommandPalette groups={getAllowedAdminNav(adminPermissions ?? [])} />
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/app">{m.admin_layout__exit()}</Link>
          </Button>
        </>
      }
    >
      <Outlet />
    </ConsoleLayout>
  );
}
