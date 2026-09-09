import { and, eq } from "drizzle-orm";

import { db } from "#@/connection";
import { entitlementDefinition, planEntitlement } from "#@/schema/platform.schema";

export type EntitlementValueType = "boolean" | "integer" | "decimal" | "string";
export type EntitlementValue = boolean | number | string;

export async function listEntitlementDefinitions() {
  return db.select().from(entitlementDefinition).orderBy(entitlementDefinition.code);
}

export async function listPlanEntitlements(planId: string) {
  const rows = await db
    .select({ definition: entitlementDefinition, value: planEntitlement })
    .from(planEntitlement)
    .innerJoin(
      entitlementDefinition,
      eq(planEntitlement.entitlementCode, entitlementDefinition.code)
    )
    .where(eq(planEntitlement.planId, planId))
    .orderBy(entitlementDefinition.code);
  return rows.map(({ definition, value }) => ({
    code: definition.code,
    description: definition.description,
    name: definition.name,
    value: value.booleanValue ?? value.integerValue ?? value.decimalValue ?? value.stringValue,
    valueType: definition.valueType as EntitlementValueType
  }));
}

export async function setPlanEntitlement(
  planId: string,
  code: string,
  valueType: EntitlementValueType,
  value: EntitlementValue
) {
  const [definition] = await db
    .select()
    .from(entitlementDefinition)
    .where(eq(entitlementDefinition.code, code))
    .limit(1);
  if (!definition || definition.valueType !== valueType) return null;
  const values = {
    booleanValue: valueType === "boolean" ? (value as boolean) : null,
    decimalValue: valueType === "decimal" ? String(value) : null,
    entitlementCode: code,
    integerValue: valueType === "integer" ? (value as number) : null,
    planId,
    stringValue: valueType === "string" ? (value as string) : null,
    updatedAt: new Date()
  };
  const [row] = await db
    .insert(planEntitlement)
    .values(values)
    .onConflictDoUpdate({
      target: [planEntitlement.planId, planEntitlement.entitlementCode],
      set: values
    })
    .returning();
  return row;
}

export async function removePlanEntitlement(planId: string, code: string) {
  const rows = await db
    .delete(planEntitlement)
    .where(and(eq(planEntitlement.planId, planId), eq(planEntitlement.entitlementCode, code)))
    .returning({ code: planEntitlement.entitlementCode });
  return rows.length > 0;
}
