/* eslint-disable jest/no-standalone-expect, jest/require-to-throw-message -- integration wrapper */
import { describe, expect } from "vite-plus/test";

import { createCallerFor, expectOrpcError, integrationIt, seedOrgWithOwner } from "./harness";

describe.sequential("projects", () => {
  integrationIt("creates stable scoped slugs, audits and archives", async () => {
    const seed = await seedOrgWithOwner();
    const caller = await createCallerFor({ seed });
    const first = await caller.console.projects.create({ name: "Finora CRM", description: "One" });
    const second = await caller.console.projects.create({ name: "Finora CRM" });
    const third = await caller.console.projects.create({ name: "Finora CRM" });
    expect(first).toMatchObject({
      workspaceId: seed.organizationId,
      createdBy: seed.userId,
      slug: "finora-crm",
      status: "draft"
    });
    expect(second.slug).toBe("finora-crm-2");
    expect(third.slug).toBe("finora-crm-3");
    const updated = await caller.console.projects.update({
      projectId: first.id,
      name: "Renamed",
      description: "Two"
    });
    expect(updated.slug).toBe("finora-crm");
    const archived = await caller.console.projects.archive({ projectId: first.id });
    expect(archived.status).toBe("archived");
    expect(archived.archivedAt).not.toBeNull();
    await expectOrpcError(
      () => caller.console.projects.update({ projectId: first.id, name: "Nope" }),
      "NOT_FOUND"
    );
  });

  integrationIt("paginates and prevents tenant IDOR", async () => {
    const a = await seedOrgWithOwner();
    const b = await seedOrgWithOwner();
    const callerA = await createCallerFor({ seed: a });
    const callerB = await createCallerFor({ seed: b });
    const a1 = await callerA.console.projects.create({ name: "A One" });
    await callerA.console.projects.create({ name: "A Two" });
    const b1 = await callerB.console.projects.create({ name: "B One" });
    const firstPage = await callerA.console.projects.list({ limit: 1 });
    const secondPage = await callerA.console.projects.list({
      cursor: firstPage.meta.nextCursor ?? undefined,
      limit: 1
    });
    expect(firstPage.data).toHaveLength(1);
    expect(secondPage.data[0]?.id).not.toBe(firstPage.data[0]?.id);
    expect(
      (await callerA.console.projects.list({ search: "A One" })).data.map((entry) => entry.id)
    ).toEqual([a1.id]);
    await expectOrpcError(() => callerA.console.projects.get({ projectId: b1.id }), "NOT_FOUND");
    await expectOrpcError(
      () => callerA.console.projects.archive({ projectId: b1.id }),
      "NOT_FOUND"
    );
    await expectOrpcError(
      () => callerA.console.projects.list({ cursor: "bad", limit: 1 }),
      "BAD_REQUEST"
    );
    await expectOrpcError(() => callerA.console.projects.list({ limit: 101 }), "BAD_REQUEST");
    await expectOrpcError(
      () => callerA.console.projects.list({ cursor: "e30", limit: 1 }),
      "BAD_REQUEST"
    );
  });

  integrationIt("keeps archive filters and write permissions server-side", async () => {
    const owner = await seedOrgWithOwner();
    const ownerCaller = await createCallerFor({ seed: owner });
    const project = await ownerCaller.console.projects.create({ name: "Archived project" });
    await ownerCaller.console.projects.archive({ projectId: project.id });

    expect((await ownerCaller.console.projects.list({})).data).toHaveLength(0);
    expect((await ownerCaller.console.projects.list({ status: "archived" })).data).toMatchObject([
      { id: project.id, status: "archived" }
    ]);

    const member = await seedOrgWithOwner({ role: "member" });
    const memberCaller = await createCallerFor({ seed: member });
    expect(await memberCaller.console.projects.list({})).toMatchObject({ data: [] });
    await expectOrpcError(
      () => memberCaller.console.projects.create({ name: "Denied" }),
      "FORBIDDEN"
    );
    await expectOrpcError(
      () => memberCaller.console.projects.update({ projectId: project.id, name: "Denied" }),
      "FORBIDDEN"
    );
    await expectOrpcError(
      () => memberCaller.console.projects.archive({ projectId: project.id }),
      "FORBIDDEN"
    );
  });

  integrationIt("retries slug allocation under bounded concurrent creates", async () => {
    const seed = await seedOrgWithOwner();
    const caller = await createCallerFor({ seed });
    const created = await Promise.all(
      Array.from({ length: 3 }, () => caller.console.projects.create({ name: "Concurrent CRM" }))
    );
    expect(new Set(created.map((entry) => entry.slug))).toEqual(
      new Set(["concurrent-crm", "concurrent-crm-2", "concurrent-crm-3"])
    );
  });
});
