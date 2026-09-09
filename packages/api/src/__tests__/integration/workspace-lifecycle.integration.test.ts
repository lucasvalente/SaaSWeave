/* eslint-disable jest/no-standalone-expect, jest/require-to-throw-message -- integration wrapper */
import { randomUUID } from "node:crypto";

import { describe, expect } from "vite-plus/test";

import { db } from "@saasweave/db";
import { platformRoleAssignment } from "@saasweave/db/schema";

import { createCallerFor, expectOrpcError, integrationIt, seedOrgWithOwner } from "./harness";

describe.sequential("workspace lifecycle", () => {
  integrationIt(
    "suspends project mutations, preserves reads, and reactivates without affecting another workspace",
    async () => {
      const adminSeed = await seedOrgWithOwner();
      await db
        .insert(platformRoleAssignment)
        .values({ id: randomUUID(), role: "platform_admin", userId: adminSeed.userId });
      const admin = await createCallerFor({ seed: adminSeed, mfaEnabled: true });
      const a = await seedOrgWithOwner();
      const b = await seedOrgWithOwner();
      const callerA = await createCallerFor({ seed: a });
      const callerB = await createCallerFor({ seed: b });
      const projectA = await callerA.console.projects.create({ name: "Project A" });
      await admin.admin.workspaces.suspend({ id: a.organizationId, reason: "Operational test" });
      expect((await callerA.console.projects.list({})).data).toHaveLength(1);
      await expect(callerA.console.projects.get({ projectId: projectA.id })).resolves.toBeDefined();
      await expectOrpcError(
        () => callerA.console.projects.create({ name: "Blocked" }),
        "FORBIDDEN"
      );
      await expectOrpcError(
        () => callerA.console.projects.update({ projectId: projectA.id, name: "Blocked" }),
        "FORBIDDEN"
      );
      await expectOrpcError(
        () => callerA.console.projects.archive({ projectId: projectA.id }),
        "FORBIDDEN"
      );
      await expect(
        callerB.console.projects.create({ name: "Still active" })
      ).resolves.toBeDefined();
      await expectOrpcError(
        () => admin.admin.workspaces.suspend({ id: a.organizationId, reason: "Again" }),
        "CONFLICT"
      );
      await admin.admin.workspaces.reactivate({ id: a.organizationId });
      await expect(
        callerA.console.projects.update({ projectId: projectA.id, name: "Allowed again" })
      ).resolves.toBeDefined();
      await expectOrpcError(
        () => admin.admin.workspaces.reactivate({ id: a.organizationId }),
        "CONFLICT"
      );
    }
  );
});
