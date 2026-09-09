import { describe, expect } from "vite-plus/test";

import {
  createCallerFor,
  expectOrpcError,
  integrationIt,
  seedApiKey,
  seedOrganizationFeatureFlags,
  seedOrganizationPlan,
  seedOrgWithOwner
} from "./harness";

describe.sequential("Workspace A/B tenant isolation", () => {
  integrationIt(
    "allows A reads and mutation while denying B detail and IDOR mutation",
    async () => {
      const a = await seedOrgWithOwner({ organizationName: "Workspace A" });
      const b = await seedOrgWithOwner({ organizationName: "Workspace B" });
      for (const seed of [a, b]) {
        await seedOrganizationPlan(seed.organizationId);
        await seedOrganizationFeatureFlags(seed.organizationId, { api_keys: true });
      }
      const keyA = await seedApiKey({ createdBy: a.userId, organizationId: a.organizationId });
      const keyB = await seedApiKey({ createdBy: b.userId, organizationId: b.organizationId });
      const callerA = await createCallerFor({ seed: a });
      const callerB = await createCallerFor({ seed: b });
      expect((await callerA.console.team()).organizationId).toBe(a.organizationId);
      expect((await callerA.console.apiKeys.list()).map((entry) => entry.id)).toEqual([keyA.id]);
      await expectOrpcError(
        () => callerA.admin.workspaces.detail({ id: b.organizationId }),
        "FORBIDDEN"
      );
      await expectOrpcError(
        () => callerA.console.apiKeys.revoke({ id: keyB.id }),
        "API_KEY_NOT_FOUND"
      );
      expect((await callerB.console.apiKeys.list())[0]?.revokedAt).toBeNull();
      expect(await callerA.console.apiKeys.revoke({ id: keyA.id })).toEqual({ ok: true });
      const spoofed = await createCallerFor({ seed: a, organizationId: b.organizationId });
      expect((await spoofed.console.team()).organizationId).toBe(a.organizationId);
      expect((await spoofed.console.apiKeys.list()).some((entry) => entry.id === keyB.id)).toBe(
        false
      );
    }
  );
});
