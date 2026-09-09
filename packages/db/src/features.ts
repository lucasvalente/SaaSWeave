import { eq } from "drizzle-orm";

import { db } from "#@/connection";
import { featureFlag } from "#@/schema/platform.schema";

/** Platform-wide default for a feature flag (no org override or plan check). */
export async function isFeatureGloballyEnabled(key: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: featureFlag.enabled })
    .from(featureFlag)
    .where(eq(featureFlag.key, key))
    .limit(1);
  return row?.enabled ?? false;
}

/** Canonical server-side global resolver (workspace overrides are handled by API feature service). */
export async function resolveFeatureFlag(key: string): Promise<boolean> {
  return isFeatureGloballyEnabled(key);
}
