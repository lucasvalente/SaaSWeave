import { eq } from "drizzle-orm";
import { describe, expect } from "vite-plus/test";

import { db } from "@saasweave/db";
import { organization, project } from "@saasweave/db/schema";

import {
  createCallerFor,
  expectOrpcError,
  integrationIt,
  seedOrgWithOwner,
  seedPlatformAdmin
} from "./harness";

describe.sequential("Admin workspace listing", () => {
  integrationIt("filters in the database and validates cursor pagination", async () => {
    const seed = await seedOrgWithOwner({ email: "owner-a@workspace.test" });
    const other = await seedOrgWithOwner({ email: "owner-b@workspace.test" });
    await seedPlatformAdmin(seed.userId);
    await db
      .update(organization)
      .set({ name: "Workspace Alpha", operationalStatus: "active" })
      .where(eq(organization.id, seed.organizationId));
    await db
      .update(organization)
      .set({ name: "Workspace Beta", operationalStatus: "suspended" })
      .where(eq(organization.id, other.organizationId));
    await db.insert(project).values([
      {
        createdBy: seed.userId,
        id: "workspace-alpha-active",
        name: "Alpha active",
        slug: "alpha-active",
        status: "active",
        workspaceId: seed.organizationId
      },
      {
        archivedAt: new Date(),
        createdBy: seed.userId,
        id: "workspace-alpha-archived",
        name: "Alpha archived",
        slug: "alpha-archived",
        status: "archived",
        workspaceId: seed.organizationId
      }
    ]);
    const caller = await createCallerFor({ seed, userRole: "admin" });
    const filtered = await caller.admin.workspaces.list({
      search: "owner-a",
      status: "active",
      limit: 1
    });
    expect(filtered.workspaces.map((entry) => entry.id)).toEqual([seed.organizationId]);
    expect(
      (await caller.admin.workspaces.list({ search: "Alpha", status: "active" })).workspaces.map(
        (entry) => entry.id
      )
    ).toEqual([seed.organizationId]);
    expect(
      (await caller.admin.workspaces.list({ search: "Beta", status: "suspended" })).workspaces.map(
        (entry) => entry.id
      )
    ).toEqual([other.organizationId]);
    expect(filtered.workspaces[0]).toMatchObject({
      memberCount: 1,
      projectCount: 2,
      activeProjectCount: 1,
      archivedProjectCount: 1
    });
    const first = await caller.admin.workspaces.list({ limit: 1 });
    expect(first.nextCursor).toBeTruthy();
    const second = await caller.admin.workspaces.list({ limit: 1, cursor: first.nextCursor! });
    expect(second.workspaces[0]?.id).not.toBe(first.workspaces[0]?.id);
    for (const limit of [0, -1, 101]) {
      await expectOrpcError(() => caller.admin.workspaces.list({ limit }), "BAD_REQUEST");
    }
    for (const cursor of ["invalid", "e30", "-1"]) {
      await expectOrpcError(() => caller.admin.workspaces.list({ cursor }), "BAD_REQUEST");
    }
    const detail = await caller.admin.workspaces.detail({ id: seed.organizationId });
    expect(detail.owner?.email).toBe(seed.email);
    expect(detail.team.members).toHaveLength(1);
    expect(detail).toMatchObject({
      projectCount: 2,
      activeProjectCount: 1,
      archivedProjectCount: 1,
      operationalStatus: "active"
    });
  });
});
