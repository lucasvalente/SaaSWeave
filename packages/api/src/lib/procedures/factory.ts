import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";

import { type ApiKeyScope } from "@saasweave/core/api-keys";
import { db, getPlatformRoles, recordSecurityEvent } from "@saasweave/db";
import { organization as organizationTable, session as authSession } from "@saasweave/db/schema";
import { can, isPrivilegedPlatformRole, type PlatformPermission } from "@saasweave/permissions";

import { assertApiKeyScopes } from "#@/lib/api-key-scopes";
import { hasFreshAdminStepUp } from "#@/lib/admin-step-up";
import { type OrpcContext } from "#@/lib/context/types";
import { isFeatureEnabledForOrg } from "#@/lib/features";
import { assertIpAllowedForOrganization } from "#@/lib/ip-allowlist";
import { resolveActiveOrganization } from "#@/lib/organization";

const o = os.$context<OrpcContext>();

async function enforceOrgIpAccess(context: OrpcContext, organizationId: string): Promise<void> {
  const impersonating = Boolean(context.session?.session?.impersonatedBy);
  try {
    await assertIpAllowedForOrganization(organizationId, context.clientIp, {
      bypass: impersonating
    });
  } catch (error) {
    throw new ORPCError("FORBIDDEN", {
      message: error instanceof Error ? error.message : "IP address not allowed."
    });
  }
}

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  const activeSession = context.session?.session;
  if (!context.session?.user || !activeSession) {
    throw new ORPCError("UNAUTHORIZED");
  }

  // The cookie was valid when Better Auth built the context, but an operator may
  // revoke the session between that point and a sensitive oRPC call. Re-checking
  // its backing row makes revocation take precedence over permissions and MFA.
  const [storedSession] = await db
    .select({ expiresAt: authSession.expiresAt, userId: authSession.userId })
    .from(authSession)
    .where(eq(authSession.id, activeSession.id))
    .limit(1);
  if (
    !storedSession ||
    storedSession.userId !== context.session.user.id ||
    storedSession.expiresAt.getTime() <= Date.now()
  ) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session
    }
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth).route({
  spec: (spec) => {
    return {
      ...spec,
      security: [{ authCookie: [] }]
    };
  }
});

/**
 * Authenticated + scoped to the caller's active organization. Handlers receive
 * `context.organization` ({ id, role }); all tenant data must be read through it.
 */
export const orgProcedure = protectedProcedure.use(async ({ context, next }) => {
  const organization = await resolveActiveOrganization(context.session);
  await enforceOrgIpAccess(context, organization.id);
  return next({ context: { organization } });
});

/** Customer mutations must stop while a workspace is administratively suspended. */
export const operationalOrgProcedure = orgProcedure.use(async ({ context, next }) => {
  const [workspace] = await db
    .select({ status: organizationTable.operationalStatus })
    .from(organizationTable)
    .where(eq(organizationTable.id, context.organization.id))
    .limit(1);
  if (!workspace || workspace.status === "suspended") {
    throw new ORPCError("FORBIDDEN", { message: "This workspace is suspended." });
  }
  return next();
});

/**
 * Workspace-scoped access via session or API key. API key callers receive a
 * synthetic `developer` role for authorization helpers.
 */
export const integrationProcedure = publicProcedure.use(async ({ context, next }) => {
  if (context.apiKey) {
    await enforceOrgIpAccess(context, context.apiKey.organizationId);
    return next({
      context: {
        organization: { id: context.apiKey.organizationId, role: "developer" }
      }
    });
  }
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const organization = await resolveActiveOrganization(context.session);
  await enforceOrgIpAccess(context, organization.id);
  return next({
    context: {
      organization,
      session: context.session
    }
  });
});

/** Require API key scopes when the `api_key_scopes` feature is enabled. */
export function requireApiKeyScope(...required: ApiKeyScope[]) {
  return integrationProcedure.use(async ({ context, next }) => {
    if (context.apiKey) {
      await assertApiKeyScopes(context.apiKey.organizationId, context.apiKey.scopes, required);
    }
    return next();
  });
}

/** Require a feature flag to be enabled for the active organization. */
export function requireFeature(featureKey: string) {
  return orgProcedure.use(async ({ context, next }) => {
    const enabled = await isFeatureEnabledForOrg(context.organization.id, featureKey);
    if (!enabled) {
      throw new ORPCError("FORBIDDEN", {
        message: `Feature "${featureKey}" is not enabled for this workspace.`
      });
    }
    return next();
  });
}

export function requirePlatformPermission(permission: PlatformPermission) {
  return protectedProcedure.use(async ({ context, next }) => {
    const roles = await getPlatformRoles(context.session.user.id, context.session.user.role);
    if (roles.some(isPrivilegedPlatformRole) && !context.session.user.twoFactorEnabled) {
      await recordSecurityEvent({
        type: "mfa.enrollment_required",
        severity: "warning",
        actorUserId: context.session.user.id,
        ipAddress: context.clientIp,
        requestId: context.requestId,
        traceId: context.traceId
      });
      throw new ORPCError("FORBIDDEN", {
        message: "Multi-factor authentication enrollment is required for this platform role."
      });
    }
    if (!can(roles, permission)) {
      await recordSecurityEvent({
        type: "permission.denied",
        severity: "warning",
        actorUserId: context.session.user.id,
        ipAddress: context.clientIp,
        requestId: context.requestId,
        traceId: context.traceId,
        metadata: { permission }
      });
      throw new ORPCError("FORBIDDEN");
    }
    // Financial mutations require a fresh, session-bound TOTP proof in
    // addition to the canonical platform permission. Reads remain unaffected.
    if (permission === "billing.write" && !(await hasFreshAdminStepUp(context.session.session.id, context.session.user.id))) {
      throw new ORPCError("PRECONDITION_FAILED", { message: "STEP_UP_REQUIRED" });
    }
    return next({ context });
  });
}

export function requirePlatformPermissionWithStepUp(permission: PlatformPermission) {
  return requirePlatformPermission(permission).use(async ({ context, next }) => {
    if (!(await hasFreshAdminStepUp(context.session.session.id, context.session.user.id))) {
      throw new ORPCError("PRECONDITION_FAILED", { message: "STEP_UP_REQUIRED" });
    }
    return next({ context });
  });
}

/** Compatibility procedure; new endpoints should request their exact grant. */
export const adminProcedure = requirePlatformPermission("platform.dashboard.read");
