import { randomUUID } from "node:crypto";

import { describe, expect } from "vite-plus/test";

import { db } from "@saasweave/db";
import { platformRoleAssignment } from "@saasweave/db/schema";

import { createCallerFor, expectOrpcError, integrationIt, seedOrgWithOwner } from "./harness";

const matrix = {
  super_admin: [true, true, true, true, true, true, true, true, true],
  platform_admin: [true, true, false, true, true, true, true, true, true],
  engineering: [false, true, false, false, false, false, false, true, true],
  security: [true, false, false, true, true, true, false, false, true],
  support: [true, true, false, true, true, false, false, false, false],
  readonly: [true, true, false, true, true, true, true, true, true]
} as const;

describe.sequential("Admin permission matrix", () => {
  for (const role of Object.keys(matrix) as Array<keyof typeof matrix>) {
    integrationIt(`${role}: nine module reads and protected writes`, async () => {
      const seed = await seedOrgWithOwner();
      await db
        .insert(platformRoleAssignment)
        .values({ id: randomUUID(), userId: seed.userId, role });
      const caller = await createCallerFor({ seed, mfaEnabled: true });
      const reads = [
        () => caller.admin.users.list({}),
        () => caller.admin.workspaces.list({}),
        () => caller.admin.roles.list(),
        () => caller.admin.sessions.list({}),
        () => caller.admin.security.audit({}),
        () => caller.admin.security.events({}),
        () => caller.admin.settings.get(),
        () => caller.admin.features.list({}),
        () => caller.admin.system.health()
      ];
      for (const [index, read] of reads.entries()) {
        if (matrix[role][index]) await expect(read()).resolves.toBeDefined();
        else await expectOrpcError(read, "FORBIDDEN");
      }
      if (role !== "super_admin" && role !== "platform_admin") {
        await expectOrpcError(
          () => caller.admin.settings.update({ platformName: "Unauthorized" }),
          "FORBIDDEN"
        );
      }
      if (!["super_admin", "platform_admin", "engineering"].includes(role)) {
        await expectOrpcError(
          () => caller.admin.features.toggleGlobal({ key: "ai_assistant", enabled: false }),
          "FORBIDDEN"
        );
        await expectOrpcError(
          () => caller.admin.workspaces.updatePlan({ id: seed.organizationId, planId: "free" }),
          "FORBIDDEN"
        );
      }
      const access = await caller.admin.access();
      const target = await seedOrgWithOwner();
      const writes = [
        {
          allowed: ["super_admin", "platform_admin"].includes(role),
          run: () => caller.admin.settings.update({ platformName: "Permission matrix" })
        },
        {
          allowed: ["super_admin", "platform_admin", "engineering"].includes(role),
          run: () => caller.admin.features.toggleGlobal({ key: "ai_assistant", enabled: true })
        },
        {
          allowed: ["super_admin", "platform_admin", "engineering"].includes(role),
          run: () =>
            caller.admin.workspaces.updatePlan({ id: target.organizationId, planId: "free" })
        },
        {
          allowed: ["super_admin", "platform_admin", "security"].includes(role),
          run: () => caller.admin.sessions.revoke({ id: target.sessionId })
        },
        {
          allowed: role === "super_admin",
          run: () => caller.admin.users.setRoles({ id: target.userId, roles: ["support"] })
        }
      ];
      for (const write of writes) {
        if (write.allowed) await expect(write.run()).resolves.toBeDefined();
        else await expectOrpcError(write.run, "FORBIDDEN");
      }
      expect(access.roles).toEqual([role]);
      const search = await caller.admin.search({ search: seed.email.slice(0, 5) });
      if (!matrix[role][0]) expect(search.users).toEqual([]);
      if (!matrix[role][1]) expect(search.workspaces).toEqual([]);
    });
  }
});
