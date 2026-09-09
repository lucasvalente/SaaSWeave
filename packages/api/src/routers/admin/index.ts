import { getPlatformAuditLog } from "@saasweave/db";

import { adminProcedure, requirePlatformPermission } from "#@/lib/procedures/factory";
import { adminCatalogRouter } from "#@/routers/admin/catalog";
import {
  adminWorkspacesInputSchema,
  buildAdminWorkspaces,
  buildPlatformStats
} from "#@/routers/admin/data";
import { adminEmailsRouter } from "#@/routers/admin/emails";
import { adminMembershipsRouter } from "#@/routers/admin/memberships";
import { adminOperationsRouter } from "#@/routers/admin/operations";
import { adminProjectsRouter } from "#@/routers/admin/projects";
import { adminSettingsRouter } from "#@/routers/admin/settings";
import { adminSubscriptionsRouter } from "#@/routers/admin/subscriptions";
import { adminSystemRouter } from "#@/routers/admin/system";
import { adminWorkspacesRouter } from "#@/routers/admin/workspaces";
import { adminUsageRouter } from "#@/routers/admin/usage";
import { adminBillingRouter } from "#@/routers/admin/billing";

/**
 * Admin router — the platform operator's unified view across every customer
 * workspace: revenue analytics, the workspace roster, and feature adoption.
 *
 * Each module requires its own platform permission; persisted assignments are
 * authoritative, with a compatibility bridge for legacy Better Auth admins.
 */
export const adminRouter = {
  system: adminSystemRouter,
  access: adminOperationsRouter.access,
  search: adminOperationsRouter.search,
  platformStats: adminProcedure
    .route({
      description: "Platform-wide revenue, retention, and plan-distribution analytics",
      method: "GET"
    })
    .handler(() => buildPlatformStats()),

  workspaces: {
    list: requirePlatformPermission("workspaces.read")
      .route({
        description:
          "Cursor-paginated roster of customer workspaces with plan, seats, MRR, and status",
        method: "GET"
      })
      .input(adminWorkspacesInputSchema)
      .handler(({ input }) => buildAdminWorkspaces(input)),
    detail: adminWorkspacesRouter.detail,
    updatePlan: adminWorkspacesRouter.updatePlan,
    suspend: adminWorkspacesRouter.suspend,
    reactivate: adminWorkspacesRouter.reactivate
  },

  projects: adminProjectsRouter,
  memberships: adminMembershipsRouter,

  auditLog: requirePlatformPermission("audit.read")
    .route({
      description: "Platform-wide audit trail of security- and billing-relevant actions",
      method: "GET"
    })
    .handler(() => getPlatformAuditLog({ limit: 60 })),

  emails: adminEmailsRouter,
  users: adminOperationsRouter.users,
  auth: adminOperationsRouter.auth,
  roles: adminOperationsRouter.roles,
  sessions: adminOperationsRouter.sessions,
  security: adminOperationsRouter.security,
  features: adminCatalogRouter.features,
  plans: adminCatalogRouter.plans,
  subscriptions: adminSubscriptionsRouter,
  usage: adminUsageRouter,
  billing: adminBillingRouter,
  settings: adminSettingsRouter
};
