import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique
} from "drizzle-orm/pg-core";

import { organization, user } from "#@/schema/auth.schema";

/** Persisted platform RBAC assignments; grants are resolved by @saasweave/permissions. */
export const platformRoleAssignment = pgTable(
  "platform_role_assignment",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: text("created_by")
  },
  (table) => [
    unique("platform_role_assignment_user_role").on(table.userId, table.role),
    index("platform_role_assignment_user_idx").on(table.userId)
  ]
);

/** Append-only security event ledger. Metadata is sanitized before persistence. */
export const securityEvent = pgTable(
  "security_event",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null"
    }),
    targetType: text("target_type"),
    targetId: text("target_id"),
    requestId: text("request_id"),
    traceId: text("trace_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    index("security_event_created_idx").on(table.createdAt),
    index("security_event_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("security_event_org_created_idx").on(table.organizationId, table.createdAt)
  ]
);

/**
 * Plan catalog — what the platform sells. Seeded once from
 * `@saasweave/core` defaults when empty (see `ensureCatalogSeeded`), then
 * fully admin-editable. `organization.planId` references `id` loosely (no
 * FK) so existing rows never break if the catalog is re-seeded.
 */
export const plan = pgTable("plan", {
  cta: text("cta").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  highlights: jsonb("highlights").$type<string[]>().notNull(),
  id: text("id").primaryKey(),
  isDefault: boolean("is_default").default(false).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  name: text("name").notNull(),
  popular: boolean("popular").default(false).notNull(),
  priceMonthly: integer("price_monthly"),
  seatPrice: integer("seat_price"),
  seatsIncluded: integer("seats_included").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  tagline: text("tagline").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});

/** Canonical capability definition. Values are typed by `valueType`. */
export const entitlementDefinition = pgTable("entitlement_definition", {
  code: text("code").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  description: text("description"),
  name: text("name").notNull(),
  valueType: text("value_type").notNull()
});

/** Plan-specific entitlement values. Exactly one typed value column is used. */
export const planEntitlement = pgTable(
  "plan_entitlement",
  {
    booleanValue: boolean("boolean_value"),
    decimalValue: text("decimal_value"),
    entitlementCode: text("entitlement_code")
      .notNull()
      .references(() => entitlementDefinition.code, { onDelete: "cascade" }),
    integerValue: integer("integer_value"),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    stringValue: text("string_value"),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    unique("plan_entitlement_plan_code").on(table.planId, table.entitlementCode),
    index("plan_entitlement_code_idx").on(table.entitlementCode)
  ]
);

/** One manually assignable subscription for a workspace. Stripe remains an external concern. */
export const workspaceSubscription = pgTable(
  "workspace_subscription",
  {
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    currentPeriodStart: timestamp("current_period_start"),
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id),
    seats: integer("seats").default(1).notNull(),
    source: text("source").default("admin").notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    status: text("status").default("active").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    version: integer("version").default(1).notNull()
  },
  (table) => [
    index("workspace_subscription_org_idx").on(table.organizationId),
    index("workspace_subscription_status_idx").on(table.status, table.updatedAt)
  ]
);

/** Immutable change history for support and operator auditability. */
export const workspaceSubscriptionHistory = pgTable(
  "workspace_subscription_history",
  {
    action: text("action").notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fromPlanId: text("from_plan_id"),
    fromStatus: text("from_status"),
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => workspaceSubscription.id, { onDelete: "cascade" }),
    toPlanId: text("to_plan_id"),
    toStatus: text("to_status").notNull()
  },
  (table) => [index("workspace_subscription_history_sub_idx").on(table.subscriptionId, table.createdAt)]
);

/**
 * Feature flag catalog — global default state plus an optional staged
 * rollout percentage. Per-workspace overrides live in
 * `organizationFeatureFlag`; an override always wins over the global default.
 */
export const featureFlag = pgTable("feature_flag", {
  availableOn: jsonb("available_on").$type<string[]>().notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  rollout: integer("rollout"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});

/** Per-workspace feature flag override. Presence of a row overrides the global default. */
export const organizationFeatureFlag = pgTable(
  "organization_feature_flag",
  {
    enabled: boolean("enabled").notNull(),
    featureKey: text("feature_key")
      .notNull()
      .references(() => featureFlag.key, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    index("organization_feature_flag_org_idx").on(table.organizationId),
    unique("organization_feature_flag_org_feature_key").on(table.organizationId, table.featureKey)
  ]
);

/**
 * Singleton platform-wide settings row (`id` is always `"default"`).
 * Created on first read with defaults if missing.
 */
export const platformSettings = pgTable("platform_settings", {
  billingMode: text("billing_mode").notNull(),
  currency: text("currency").notNull(),
  id: text("id").primaryKey(),
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  platformName: text("platform_name").notNull(),
  signupsOpen: boolean("signups_open").default(true).notNull(),
  supportEmail: text("support_email").notNull(),
  trialsEnabled: boolean("trials_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});
