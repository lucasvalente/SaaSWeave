/* eslint-disable jest/no-standalone-expect, jest/require-to-throw-message -- integration wrapper */
import { randomUUID } from "node:crypto";

import { describe, expect } from "vite-plus/test";

import { db } from "@saasweave/db";
import { platformRoleAssignment } from "@saasweave/db/schema";

import { createCallerFor, expectOrpcError, integrationIt, seedOrgWithOwner } from "./harness";

async function adminCaller() {
  const seed = await seedOrgWithOwner();
  await db
    .insert(platformRoleAssignment)
    .values({ id: randomUUID(), role: "platform_admin", userId: seed.userId });
  return { caller: await createCallerFor({ seed, mfaEnabled: true }), seed };
}

describe.sequential("admin projects", () => {
  integrationIt(
    "lists globally with search, filters, cursor, detail members and activity",
    async () => {
      const { caller: admin } = await adminCaller();
      const a = await seedOrgWithOwner({ organizationName: "Alpha workspace" });
      const b = await seedOrgWithOwner({ organizationName: "Beta workspace" });
      const callerA = await createCallerFor({ seed: a });
      const callerB = await createCallerFor({ seed: b });
      const a1 = await callerA.console.projects.create({ name: "Alpha One" });
      const a2 = await callerA.console.projects.create({ name: "Alpha Two" });
      const b1 = await callerB.console.projects.create({ name: "Beta One" });
      const first = await admin.admin.projects.list({ limit: 2 });
      const second = await admin.admin.projects.list({
        cursor: first.meta.nextCursor ?? undefined,
        limit: 2
      });
      expect(new Set([...first.data, ...second.data].map((entry) => entry.id))).toEqual(
        new Set([a1.id, a2.id, b1.id])
      );
      expect((await admin.admin.projects.list({ search: "Alpha workspace" })).data).toHaveLength(2);
      expect(
        (await admin.admin.projects.list({ workspaceId: b.organizationId })).data
      ).toMatchObject([{ id: b1.id }]);
      expect((await admin.admin.projects.list({ createdBy: a.userId })).data).toHaveLength(2);
      const detail = await admin.admin.projects.get({ projectId: a1.id });
      expect(detail).toMatchObject({
        creatorName: a.name,
        id: a1.id,
        workspaceName: a.organizationName
      });
      expect(detail.members).toEqual(
        expect.arrayContaining([expect.objectContaining({ email: a.email })])
      );
      expect(detail.activity.map((entry) => entry.action)).toContain("project.created");
    }
  );

  integrationIt("keeps admin scope distinct and protects mutations", async () => {
    const { caller: admin } = await adminCaller();
    const a = await seedOrgWithOwner();
    const b = await seedOrgWithOwner();
    const callerA = await createCallerFor({ seed: a });
    const callerB = await createCallerFor({ seed: b });
    const a1 = await callerA.console.projects.create({ name: "Tenant A" });
    const b1 = await callerB.console.projects.create({ name: "Tenant B" });
    expect((await callerA.console.projects.list({})).data.map((entry) => entry.id)).toEqual([
      a1.id
    ]);
    await expectOrpcError(() => callerA.console.projects.get({ projectId: b1.id }), "NOT_FOUND");
    await expectOrpcError(
      () => callerA.console.projects.archive({ projectId: b1.id }),
      "NOT_FOUND"
    );
    await admin.admin.projects.archive({ projectId: b1.id, reason: "Platform lifecycle" });
    expect((await admin.admin.projects.get({ projectId: b1.id })).status).toBe("archived");
    for (const role of ["support", "readonly", "finance"] as const) {
      const seed = await seedOrgWithOwner();
      await db
        .insert(platformRoleAssignment)
        .values({ id: randomUUID(), role, userId: seed.userId });
      const caller = await createCallerFor({ seed, mfaEnabled: true });
      await expect(caller.admin.projects.list({})).resolves.toBeDefined();
      await expectOrpcError(() => caller.admin.projects.archive({ projectId: a1.id }), "FORBIDDEN");
    }
    await expectOrpcError(() => callerA.admin.projects.list({}), "FORBIDDEN");
    await expectOrpcError(() => callerA.admin.projects.get({ projectId: b1.id }), "FORBIDDEN");
  });
});
