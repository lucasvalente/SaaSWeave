import { z } from "zod";

import { PlanTierSchema } from "@saasweave/core/plans";
import {
  listEntitlementDefinitions,
  listPlanEntitlements,
  recordAudit,
  removePlanEntitlement,
  setPlanEntitlement
} from "@saasweave/db";

import {
  clearFeatureForOrganization,
  ensureFeaturesSeeded,
  listFeatures,
  setFeatureForOrganization,
  setFeatureGlobalEnabled,
  setFeatureRollout
} from "#@/lib/features";
import {
  archivePlan,
  createPlan,
  deletePlan,
  getPlan,
  isPlanInUse,
  listPlans,
  updatePlan
} from "#@/lib/plans";
import { requirePlatformPermission } from "#@/lib/procedures/factory";
import { buildFeatureStats } from "#@/routers/admin/data";
import { getPlatformAuditLog } from "@saasweave/db";

const planInputSchema = z.object({
  cta: z.string().min(1).max(200),
  code: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(1000).nullable().optional(),
  highlights: z.array(z.string().min(1).max(200)).max(50),
  id: z.string().min(1),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  name: z.string().min(1).max(200),
  popular: z.boolean().optional(),
  priceMonthly: z.number().int().nonnegative().nullable(),
  seatPrice: z.number().int().nonnegative().nullable().optional(),
  seatsIncluded: z.number().int().nonnegative(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  tagline: z.string().min(1).max(200)
});
const entitlementValueSchema = z.union([z.boolean(), z.number(), z.string()]);
const entitlementTypeSchema = z.enum(["boolean", "integer", "decimal", "string"]);
const planDetailSchema = z.object({
  code: z.string(),
  description: z.string().nullable(),
  id: z.string(),
  isDefault: z.boolean(),
  isPublic: z.boolean(),
  name: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

function actor(context: { session: { user: { id: string; name: string } } }) {
  return { actorId: context.session.user.id, actorName: context.session.user.name };
}

export const adminCatalogRouter = {
  features: {
    list: requirePlatformPermission("feature_flags.read")
      .route({
        description: "Feature flag catalog with real per-feature adoption across workspaces",
        method: "POST"
      })
      .input(z.object({ keys: z.array(z.string()).optional() }))
      .handler(async ({ input }) => {
        const features = await listFeatures();
        const keys = input.keys ?? features.map((feature) => feature.key);
        const stats = await buildFeatureStats(keys);
        const statByKey = new Map(stats.stats.map((stat) => [stat.key, stat]));
        return {
          features: features.map((feature) => {
            return {
              ...feature,
              stats: statByKey.get(feature.key) ?? {
                adoptionPct: 0,
                key: feature.key,
                requests30d: 0,
                totalWorkspaces: stats.totalWorkspaces,
                workspacesEnabled: 0
              }
            };
          })
        };
      }),

    history: requirePlatformPermission("feature_flags.read")
      .route({ description: "Feature flag change history", method: "GET" })
      .input(z.object({ key: z.string().min(1) }))
      .handler(({ input }) => getPlatformAuditLog({ resource: "feature_flag", limit: 100, action: undefined }).then((rows) => rows.filter((row) => (row.metadata as Record<string, unknown> | null)?.key === input.key))),

    toggleGlobal: requirePlatformPermission("feature_flags.write")
      .route({ description: "Enable or disable a feature flag platform-wide", method: "POST" })
      .input(z.object({ enabled: z.boolean(), key: z.string() }))
      .handler(async ({ context, input }) => {
        await ensureFeaturesSeeded();
        await setFeatureGlobalEnabled(input.key, input.enabled);
        await recordAudit({
          ...actor(context),
          action: input.enabled ? "feature.enabled" : "feature.disabled",
          metadata: { key: input.key },
          targetLabel: input.key,
          targetType: "feature_flag"
        });
        return { ok: true };
      }),

    updateRollout: requirePlatformPermission("feature_flags.write")
      .route({ description: "Set a staged rollout percentage for a feature flag", method: "POST" })
      .input(z.object({ key: z.string(), rollout: z.number().int().min(0).max(100).nullable() }))
      .handler(async ({ context, input }) => {
        await ensureFeaturesSeeded();
        await setFeatureRollout(input.key, input.rollout);
        await recordAudit({
          ...actor(context),
          action: "feature.rollout_updated",
          metadata: { key: input.key, rollout: input.rollout },
          targetLabel: input.key,
          targetType: "feature_flag"
        });
        return { ok: true };
      }),

    setForOrganization: requirePlatformPermission("feature_flags.write")
      .route({ description: "Override a feature flag for a single workspace", method: "POST" })
      .input(
        z.object({
          enabled: z.boolean().nullable(),
          key: z.string(),
          organizationId: z.string()
        })
      )
      .handler(async ({ context, input }) => {
        if (input.enabled === null) {
          await clearFeatureForOrganization(input.organizationId, input.key);
        } else {
          await setFeatureForOrganization(input.organizationId, input.key, input.enabled);
        }
        await recordAudit({
          ...actor(context),
          action: "feature.override_updated",
          metadata: { enabled: input.enabled, key: input.key },
          organizationId: input.organizationId,
          targetLabel: input.key,
          targetType: "feature_flag"
        });
        return { ok: true };
      })
  },

  plans: {
    get: requirePlatformPermission("plans.read")
      .route({ description: "Get a plan and its catalog metadata", method: "GET" })
      .input(z.object({ id: z.string().min(1) }))
      .errors({ PLAN_NOT_FOUND: { description: "No plan with this id exists", status: 404 } })
      .output(planDetailSchema)
      .handler(async ({ errors, input }) => {
        const row = await getPlan(input.id);
        if (!row) throw errors.PLAN_NOT_FOUND();
        return {
          code: row.code,
          description: row.description,
          id: row.id,
          isDefault: row.isDefault,
          isPublic: row.isPublic,
          name: row.name,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        };
      }),

    entitlements: requirePlatformPermission("plans.read")
      .route({ description: "List entitlements associated with a plan", method: "GET" })
      .input(z.object({ planId: z.string().min(1) }))
      .handler(({ input }) => listPlanEntitlements(input.planId)),

    definitions: requirePlatformPermission("plans.read")
      .route({ description: "List the entitlement catalog", method: "GET" })
      .handler(() => listEntitlementDefinitions()),

    create: requirePlatformPermission("plans.create")
      .route({ description: "Add a new plan to the catalog", method: "POST" })
      .errors({
        PLAN_EXISTS: { description: "A plan with this id already exists", status: 409 }
      })
      .input(planInputSchema)
      .output(PlanTierSchema)
      .handler(async ({ context, errors, input }) => {
        const existing = await listPlans();
        if (existing.some((plan) => plan.id === input.id || plan.code === input.code)) {
          throw errors.PLAN_EXISTS();
        }
        const plan = await createPlan(input);
        await recordAudit({
          ...actor(context),
          action: "plan.created",
          targetLabel: plan.name,
          targetType: "plan"
        });
        return plan;
      }),

    update: requirePlatformPermission("plans.update")
      .route({ description: "Edit an existing plan", method: "POST" })
      .errors({
        PLAN_NOT_FOUND: { description: "No plan with this id exists", status: 404 }
      })
      .input(planInputSchema.partial().extend({ id: z.string().min(1) }))
      .output(PlanTierSchema)
      .handler(async ({ context, errors, input }) => {
        const plan = await updatePlan(input);
        if (!plan) throw errors.PLAN_NOT_FOUND();
        await recordAudit({
          ...actor(context),
          action: "plan.updated",
          targetLabel: plan.name,
          targetType: "plan"
        });
        return plan;
      }),

    archive: requirePlatformPermission("plans.archive")
      .route({
        description: "Archive a plan without deleting historical references",
        method: "POST"
      })
      .errors({ PLAN_NOT_FOUND: { description: "No plan with this id exists", status: 404 } })
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ context, errors, input }) => {
        const archived = await archivePlan(input.id);
        if (!archived) throw errors.PLAN_NOT_FOUND();
        await recordAudit({
          ...actor(context),
          action: "plan.archived",
          targetLabel: archived.name,
          targetType: "plan"
        });
        return { ok: true };
      }),

    setEntitlement: requirePlatformPermission("plans.update")
      .route({ description: "Set a typed entitlement value for a plan", method: "POST" })
      .errors({
        ENTITLEMENT_INVALID: { description: "Entitlement type or value is invalid", status: 400 }
      })
      .input(
        z.object({
          planId: z.string().min(1),
          code: z.string().min(1),
          valueType: entitlementTypeSchema,
          value: entitlementValueSchema
        })
      )
      .handler(async ({ context, errors, input }) => {
        const valid =
          input.valueType === "boolean"
            ? typeof input.value === "boolean"
            : input.valueType === "string"
              ? typeof input.value === "string"
              : typeof input.value === "number" &&
                (input.valueType !== "integer" || Number.isInteger(input.value));
        if (!valid) throw errors.ENTITLEMENT_INVALID();
        const row = await setPlanEntitlement(
          input.planId,
          input.code,
          input.valueType,
          input.value
        );
        if (!row) throw errors.ENTITLEMENT_INVALID();
        await recordAudit({
          ...actor(context),
          action: "plan.entitlement.updated",
          targetLabel: input.code,
          targetType: "plan",
          metadata: { planId: input.planId, valueType: input.valueType }
        });
        return { ok: true };
      }),

    removeEntitlement: requirePlatformPermission("plans.update")
      .route({ description: "Remove an entitlement association from a plan", method: "POST" })
      .input(z.object({ planId: z.string().min(1), code: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const ok = await removePlanEntitlement(input.planId, input.code);
        if (ok)
          {await recordAudit({
            ...actor(context),
            action: "plan.entitlement.updated",
            targetLabel: input.code,
            targetType: "plan",
            metadata: { planId: input.planId, removed: true }
          });}
        return { ok };
      }),

    remove: requirePlatformPermission("plans.archive")
      .route({ description: "Delete a plan from the catalog", method: "POST" })
      .errors({
        PLAN_IN_USE: {
          description: "One or more workspaces are still subscribed to this plan",
          status: 409
        }
      })
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ context, errors, input }) => {
        if (await isPlanInUse(input.id)) {
          throw errors.PLAN_IN_USE();
        }
        const deleted = await deletePlan(input.id);
        if (deleted) {
          await recordAudit({
            ...actor(context),
            action: "plan.deleted",
            targetLabel: input.id,
            targetType: "plan"
          });
        }
        return { ok: deleted };
      })
  }
};
